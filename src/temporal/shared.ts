/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workflow and activity names, shared by the workflow code, the worker and the
 * client.
 *
 * Constants rather than string literals at each call site: a typo in a workflow
 * type name only surfaces at runtime, as "workflow type not found" from the
 * server, which is a confusing failure for something a compiler could catch.
 */

export const TASK_QUEUE = 'quest-orchestration';

/** Saga: a multi-month seal series for one participant. */
export const SEAL_SERIES_WORKFLOW = 'sealSeriesWorkflow';

/** Signal telling a series that a seal was recorded out of band. */
export const SEAL_RECORDED_SIGNAL = 'sealRecorded';

/** Delayed timers that expire unused invitations. */
export const INVITATION_EXPIRY_WORKFLOW = 'invitationExpiryWorkflow';

/** Idempotent QR/PDF generation with bounded retries. */
export const GENERATE_CREDENTIALS_WORKFLOW = 'generateCredentialsWorkflow';

export const ACTIVITIES = {
  /** Records one seal in the series; must be idempotent per (quest, stage). */
  recordSeal: 'recordSeal',
  /** Closes the series once every stage is stamped. */
  completeSeries: 'completeSeries',
  /** Issues a new invitation token and stores its expiry. */
  issueInvitation: 'issueInvitation',
  /** Marks an expired invitation as such; safe to run repeatedly. */
  expireInvitation: 'expireInvitation',
  /** Renders the QR code and PDF certificate. */
  renderCredentials: 'renderCredentials',
  /** Publishes a domain event to the bus. */
  publishEvent: 'publishEvent',
} as const;
