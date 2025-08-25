ARG PROJECT
ARG PROJECT_PATH

ARG BUN_VERSION=1.2.20
ARG BUN_PKG_MANAGER="bun@${BUN_VERSION}"
ARG YARN_PKG_MANAGER="yarn@1.22.22"

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

# ================= TURBO PRUNE ===================

FROM base AS pruned
ARG YARN_PKG_MANAGER
ARG PROJECT
COPY . .

RUN bunx json -I -f package.json -e "this.packageManager=\"${YARN_PKG_MANAGER}\"" && \
  bunx turbo prune --scope="${PROJECT}" --docker

# ================ INSTALL DEPS ===================

FROM base AS deps

COPY --from=pruned /app/out/full .

RUN bun install --frozen-lockfile

# =================== BUILD =======================

FROM base AS builder
ARG BUN_PKG_MANAGER
ARG PROJECT_PATH
ARG PROJECT

COPY --from=deps /app .

RUN bunx json -I -f package.json -e "this.packageManager=\"${BUN_PKG_MANAGER}\"" && \
  bunx turbo build --filter="${PROJECT}..."

# ================== RELEASE ======================

FROM base AS release
ARG PROJECT_PATH

COPY --from=builder /app/${PROJECT_PATH}/.next/standalone ./
COPY --from=builder /app/${PROJECT_PATH}/.next/static ./${PROJECT_PATH}/.next/static

EXPOSE 3000

WORKDIR /app/${PROJECT_PATH}
CMD ["bun", "server.js"]
