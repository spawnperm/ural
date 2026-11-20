/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity implementations.
 *
 * Activities are where side effects live: database writes, event publishing,
 * file rendering. Unlike workflow code they may be non-deterministic, and they
 * are retried by Temporal, so **every activity here must be idempotent** —
 * assuming a retry is normal, not exceptional.
 *
 * The store is in-memory with a pluggable interface: the point of this file is
 * the contract and the idempotency discipline, not the persistence. A real
 * deployment swaps `QuestStore` for Postgres behind the same interface, and
 * nothing in the workflows changes.
 */

import crypto from 'node:crypto';
import type { ApplicationFailure } from '@temporalio/activity';
import type {
  CredentialsInput,
  CredentialsResult,
  InvitationExpiryInput,
  QuestEvent,
  RecordSealInput,
  RecordSealResult,
} from './types.ts';

/** Raised for input a retry cannot fix; mapped to a non-retryable failure. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface SealRecord {
  attemptId: string;
  stageId: string;
  sealedAt: string;
}

export interface QuestStore {
  /** Returns false when the seal already existed — the idempotency signal. */
  insertSeal(seal: SealRecord): Promise<boolean>;
  listSeals(attemptId: string): Promise<SealRecord[]>;
  completeSeries(attemptId: string, sealedStages: string[], completedAt: string): Promise<void>;
  /** Idempotent: marking an already-expired invitation is not an error. */
  markExpired(token: string, expiredAt: string): Promise<void>;
  /** Artifact metadata keyed by output key, so a retry overwrites rather than duplicates. */
  putArtifact(key: string, sha256: string, kind: 'qr' | 'pdf'): Promise<void>;
}

/** In-memory store, keyed exactly as a SQL primary key would be. */
export function createInMemoryStore(): QuestStore {
  const seals = new Map<string, SealRecord>();
  const completed = new Map<string, { sealedStages: string[]; completedAt: string }>();
  const expired = new Map<string, string>();
  const artifacts = new Map<string, { sha256: string; kind: 'qr' | 'pdf' }>();

  return {
    async insertSeal(seal) {
      const key = `${seal.attemptId}::${seal.stageId}`;
      if (seals.has(key)) {
        return false;
      }
      seals.set(key, seal);
      return true;
    },
    async listSeals(attemptId) {
      return [...seals.values()].filter((seal) => seal.attemptId === attemptId);
    },
    async completeSeries(attemptId, sealedStages, completedAt) {
      completed.set(attemptId, { sealedStages, completedAt });
    },
    async markExpired(token, expiredAt) {
      expired.set(token, expiredAt);
    },
    async putArtifact(key, sha256, kind) {
      artifacts.set(key, { sha256, kind });
    },
  };
}

export type PublishedEvent = QuestEvent;

export interface ActivityDeps {
  store: QuestStore;
  /** Publishes to the event bus; injected so tests can capture instead of send. */
  publish: (event: QuestEvent) => Promise<void>;
  /** Renders credentials; injected so the saga is testable without a PDF toolchain. */
  render: (input: CredentialsInput) => Promise<CredentialsResult>;
}

/**
 * Builds the activity implementations against injected dependencies.
 *
 * Returned as an object so the worker registers exactly these functions and a
 * test can call them directly with fakes — the two never drift because there is
 * one factory.
 */
export function createActivities(deps: ActivityDeps) {
  return {
    async recordSeal(input: RecordSealInput): Promise<RecordSealResult> {
      if (!input.attemptId || !input.stageId) {
        // Non-retryable: a retry would fail identically.
        throw new ValidationError('attemptId и stageId обязательны.');
      }
      if (Number.isNaN(Date.parse(input.sealedAt))) {
        throw new ValidationError(`Некорректная дата печати: ${input.sealedAt}`);
      }

      const created = await deps.store.insertSeal({
        attemptId: input.attemptId,
        stageId: input.stageId,
        sealedAt: input.sealedAt,
      });

      const seals = await deps.store.listSeals(input.attemptId);
      const sealedStages = seals.map((seal) => seal.stageId);

      return {
        created,
        sealedStages,
        // The activity does not know the plan, so it reports what is sealed and
        // lets the workflow decide what remains.
        remainingStages: [],
      };
    },

    async completeSeries(input: {
      attemptId: string;
      sealedStages: string[];
      completedAt: string;
    }): Promise<void> {
      if (!input.attemptId) {
        throw new ValidationError('attemptId обязателен.');
      }
      await deps.store.completeSeries(input.attemptId, input.sealedStages, input.completedAt);
    },

    async expireInvitation(input: InvitationExpiryInput): Promise<void> {
      if (!input.invitationToken) {
        throw new ValidationError('invitationToken обязателен.');
      }
      // Idempotent by construction: the store keys on the token.
      await deps.store.markExpired(input.invitationToken, input.expiresAt);
    },

    async renderCredentials(input: CredentialsInput): Promise<CredentialsResult> {
      if (!input.attemptId || !input.outputKey) {
        throw new ValidationError('attemptId и outputKey обязательны.');
      }
      return deps.render(input);
    },

    async publishEvent(event: QuestEvent): Promise<void> {
      if (!event.subject || !event.type) {
        throw new ValidationError('subject и type обязательны.');
      }
      await deps.publish(event);
    },
  };
}

export type QuestActivities = ReturnType<typeof createActivities>;

/**
 * Default renderer: produces a deterministic digest per artifact.
 *
 * Deliberately simple — a real implementation calls the PDF/QR toolchain. What
 * matters for the saga is that the *key* is derived from the attempt, so a retry
 * overwrites the same artifact. The digest makes the output verifiable without
 * shipping a rendering library.
 */
export function createDigestRenderer(store: QuestStore) {
  return async function render(input: CredentialsInput): Promise<CredentialsResult> {
    const artifacts: Array<{ kind: 'qr' | 'pdf'; key: string; sha256: string }> = [];

    for (const kind of ['qr', 'pdf'] as const) {
      const key = `${input.outputKey}/${kind}`;
      const digest = crypto
        .createHash('sha256')
        .update(`${input.attemptId}:${kind}:${input.participantName}:${input.achievements.join('|')}`)
        .digest('hex');

      await store.putArtifact(key, digest, kind);
      artifacts.push({ kind, key, sha256: digest });
    }

    return { artifacts };
  };
}

/** Type guard used by the worker's failure converter. */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export type { ApplicationFailure };
