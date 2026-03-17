ARG PROJECT
ARG PROJECT_PATH

ARG BUN_VERSION=1.3.10

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

# ================= TURBO PRUNE ===================

FROM base AS pruned
ARG PROJECT

COPY . .

# Prune the monorepo to only include the project and its dependencies
RUN bunx turbo prune --scope="${PROJECT}" --docker

# ================ INSTALL DEPS ===================

FROM base AS deps

# Bring in the pruned workspace
COPY --from=pruned /app/out/full .

# IMPORTANT:
# Install all deps (including devDeps)
RUN bun install --frozen-lockfile

# If you want to be absolutely sure TS types are present in the pruned tree,
# and you've declared them in the root or DS devDependencies, this is usually
# not needed. But if prune stripped them due to scope, you can uncomment:
#
# RUN bun add -d @types/react @types/react-dom @types/node typescript

# =================== BUILD =======================

FROM base AS builder
ARG PROJECT_PATH
ARG PROJECT

COPY --from=deps /app .

# Build the project and its dependencies in the pruned workspace
RUN bunx turbo build --filter="${PROJECT}..."

# ================== RELEASE ======================

FROM base AS release
ARG PROJECT_PATH

# Copy the built project and its static assets to the release image
COPY --from=builder /app/${PROJECT_PATH}/.next/standalone ./
COPY --from=builder /app/${PROJECT_PATH}/.next/static ./${PROJECT_PATH}/.next/static

EXPOSE 3000

WORKDIR /app/${PROJECT_PATH}
CMD ["bun", "server.js"]
