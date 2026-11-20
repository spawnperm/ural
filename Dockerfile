# Multi-stage build for the ural documentation portal.
#
# Stage 1 builds and verifies the bundle; stage 2 runs the Express server, which
# serves `dist/` *and* the small Git API (`/api/health`, `/api/git/*`). Serving
# dist/ from nginx would silently drop that API, so the runtime is Node, not a
# static file server.

FROM node:22-alpine AS builder

# Pin pnpm to the major this lockfile was produced with; `corepack` avoids a
# floating `npm i -g pnpm` whose resolution rules could change between builds.
ARG PNPM_VERSION=11.22.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy manifests first so the dependency layer is cached independently of source
# changes — a squashed single-stage build re-runs the install on every edit.
#
# Deliberately no `RUN --mount=type=cache`: that requires BuildKit, and this
# project must build on hosts whose Docker ships the legacy builder too. Slow
# installs on a cold cache are a fair trade for "docker build just works".
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./

RUN pnpm install --frozen-lockfile

COPY . .

# Verification happens in CI (`ci.yml`) where it can run in parallel and be
# retried cheaply. Repeating it here doubled build time for no extra guarantee.
RUN pnpm run build

# Stage 2: runtime
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Only runtime dependencies: React, Vite and Tailwind are bundled into dist/ by
# the builder stage, so they are devDependencies and never installed here.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN corepack enable \
 && corepack prepare pnpm@11.22.0 --activate \
 && pnpm install --frozen-lockfile --prod \
 && pnpm store prune

COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist ./dist

# The server runs TypeScript through Node's own type stripping, so no tsx in the
# production image. `--experimental-transform-types` is required because the
# codebase uses enums and parameter properties in places.
#
# tini reaps zombies and forwards SIGTERM, so the graceful shutdown handler in
# `src/server/shutdown.ts` actually runs instead of being bypassed by the
# container's PID 1.
RUN apk add --no-cache tini \
 && addgroup -S ural \
 && adduser -S ural -G ural \
 && chown -R ural:ural /app

USER ural

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--experimental-transform-types", "server.ts"]
