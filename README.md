# payload-turbo-bun-template

Monorepo template for **[Payload CMS 3](https://payloadcms.com)** on **[Next.js](https://nextjs.org)** (App Router), using **[Bun](https://bun.sh)** and **[Turborepo](https://turborepo.com)**. It includes a shared **[Tamagui](https://tamagui.dev)** design system, **PostgreSQL** (TimescaleDB image), and **Docker**-based local development.

---

## What’s in the stack

| Layer | Choice |
|--------|--------|
| Runtime & package manager | **Bun** (`packageManager` pinned in root `package.json`) |
| Monorepo orchestration | **Turborepo** — `build` depends on upstream packages (`^build`) |
| CMS | **Payload 3** with Postgres via `@payloadcms/db-postgres` |
| App host | **Next.js App Router** via **`@payloadcms/next`** — Payload admin + API routes in `app/(payload)`, optional Tamagui frontend in `app/(frontend)` |
| UI (shared) | **`@dappermountain/design-system`** — Tamagui 2 (config v5), `tamagui-build`, `withDesignSystem` Next plugin |
| Database (local) | **TimescaleDB** (`timescale/timescaledb`, PostgreSQL 17) via root `compose.yml` |
| Containers | **Docker Compose** — app service + DB; helper script `./scripts/up.sh` |

---

## Repository layout

```text
apps/
  payload-multi-tenant-template/    # Payload 3 app (@payloadcms/next; only app today)
packages/
  design-system/                    # Tamagui UI, Next plugin, generate:css
  typescript-config/                # Shared tsconfig fragments (base, react, nextjs)
.agents/                            # Agent rules + vendored Payload skill (see AGENTS.md)
docs/
  COMMITS.md                        # Devmoji + Conventional Commits
scripts/
  up.sh, common.sh                  # Docker Compose helpers
  validate-commit-msg.ts          # commit-msg hook + CI
git-hooks.config.ts                 # bun-git-hooks (installs on bun install)
compose.yml                         # App + Postgres services
```

---

## How the monorepo fits together

| Piece | Role |
|-------|------|
| **`apps/payload-multi-tenant-template`** | Main template — Payload config under `config/`, app code under `src/`. Declares **`@dappermountain/design-system`** and Payload packages directly in its `package.json`. |
| **`packages/design-system`** | Shared Tamagui primitives and Next integration. **`prebuild`** in the app runs `generate:css` here so `public/tamagui.generated.css` stays current. |
| **`packages/typescript-config`** | Extended TS configs consumed by workspace packages. |
| **Root `package.json`** | Turborepo scripts, shared dev tooling (ESLint, Prettier, TypeScript), and **Next/React** versions hoisted for **`@payloadcms/next`**. |
| **`bun install` (root)** | Installs all workspaces and **commit-msg hooks** via [bun-git-hooks](https://www.npmjs.com/package/bun-git-hooks). |

**Build orchestration:** [`turbo.json`](turbo.json) sets `build` → `dependsOn: ["^build"]`, so upstream workspace packages (e.g. `design-system`) build before dependents. You normally **do not** `cd` into each package and build by hand.

---

## AI agent context

| Location | Purpose |
|----------|---------|
| [`AGENTS.md`](AGENTS.md) | Monorepo entry (Bun, Turborepo, shared Payload skill) |
| [`docs/COMMITS.md`](docs/COMMITS.md) | Devmoji + Conventional Commits (hooks install on `bun install`) |
| [`.agents/rules/`](.agents/rules/) | Repo-wide workspace rules (`*.mdc`) |
| [`.agents/skills/payload/`](.agents/skills/payload/) | Vendored [payloadcms/skills](https://github.com/payloadcms/skills) — `bun run skills:update` |
| `apps/payload-multi-tenant-template/.agents/skills/dapper-payload-app/` | Template-specific overlay |

---

## Prerequisites

- **[Bun](https://bun.sh)** (match root `packageManager`, e.g. `1.3.14`)
- **[Git](https://git-scm.com/)** (commit-msg lint installs on `bun install` via [bun-git-hooks](https://www.npmjs.com/package/bun-git-hooks))
- For Docker workflow: **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (or compatible Engine + Compose)

---

## Quick start with Docker (recommended for a full stack)

The Compose project name is **`payload-turbo-bun-template`** (see `scripts/common.sh`).

1. **Clone** the repository.

2. **Install** (from repo root — also sets up git hooks):

   ```bash
   bun install
   ```

3. **Environment file** — copy the app example env and adjust (database URL, secrets, seed flags):

   ```bash
   cp apps/payload-multi-tenant-template/.env.example apps/payload-multi-tenant-template/.env
   ```

   Set `DATA_SEED_ENABLED=1` if you want a seeded database on first run.

4. **Start services** from the repo root:

   ```bash
   ./scripts/up.sh
   ```

   This runs `docker compose -f compose.yml up -d` with BuildKit enabled.

5. **Open the app** — Compose maps the app container port **3000** to host **`http://localhost:3001`**.

   - Admin: **`http://localhost:3001/admin`**
   - Frontend route group (if used): **`http://localhost:3001/`**

6. **Database** — Postgres listens on host **`localhost:5442`** (container `5432`).

The app container bind-mounts the repo to `/app` and runs `bun install && bun dev` (Payload’s dev server via Next), so edits under `./apps/payload-multi-tenant-template/src` (and workspace packages) hot-reload without rebuilding the image for day-to-day work.

---

## Local Payload development without the app container

Use this when you run **Payload on the host** (`bun dev`) and only use Docker for Postgres (or your own DB).

1. Install dependencies **from the monorepo root**:

   ```bash
   bun install
   ```

2. Ensure **`apps/payload-multi-tenant-template/.env`** exists and `DATABASE_URL` points at your database (e.g. `localhost:5442` if DB is running via Compose).

3. Start the Payload dev server (from the app directory, or use Turborepo filter):

   ```bash
   cd apps/payload-multi-tenant-template
   bun dev
   ```

   Or from root:

   ```bash
   bunx turbo dev --filter=@dappermountain/payload-multi-tenant-template
   ```

   Default URL: **`http://localhost:3000/admin`** (Compose uses **3001** on the host).

---

## Building the monorepo

**Default (recommended):** run **Turborepo from the repo root** and let it cascade `build` across the graph. You do **not** need to build `design-system` (or other deps) in separate terminals first.

```bash
bun install

# App + all upstream workspace packages (^build)
bunx turbo build --filter=@dappermountain/payload-multi-tenant-template...

# Or every package that defines a build script
bunx turbo build
```

The filter suffix **`...`** means “this package **and** its dependencies,” so `@dappermountain/design-system` runs before the app. Turbo caches outputs and skips work that is already up to date.

**Development (`bun dev`):** usually **no** prior `turbo build` is required — the Payload dev server (Next.js under the hood) transpiles `@dappermountain/design-system` from source. Production builds compile the design-system package and produce a Next **standalone** deploy artifact for the Payload app.

### Building packages individually (optional)

Use per-package commands only when you want an **atomic** build or to debug one workspace in isolation (Turbo is not involved):

```bash
cd packages/design-system
bun run build          # tamagui-build → dist/

cd packages/design-system
bun run generate:css   # updates app public/tamagui.generated.css
```

```bash
cd apps/payload-multi-tenant-template
bun run build          # prebuild (generate:css) then Payload production build (next build)
```

If you run **`bun run build` only inside the app** without a recent upstream build, ensure `packages/design-system/dist/` exists (either from a prior `turbo build` or a manual `bun run build` in that package). Prefer **`turbo build --filter=...@dappermountain/payload-multi-tenant-template`** from the root so ordering stays correct.

### Production output

The Payload app’s Next config uses **`output: 'standalone'`** so the runtime ships only what Next needs (not the full monorepo source tree). The **`Dockerfile`** under `apps/payload-multi-tenant-template/` combines:

1. **`turbo prune --docker`** — copies only this app and its workspace dependencies into the build context  
2. **`turbo build`** — builds the pruned graph (same `^build` order as local)  
3. **Standalone output** — the release stage copies `.next/standalone` + static assets into a minimal **Bun Alpine** image  

Together, **`turbo prune` + Next standalone** keeps production images small — **currently under 300MB** for this template (exact size varies with dependencies and build args). Compose dev is separate: it bind-mounts the repo and runs **`bun dev`** for Payload, not this pruned release image.

---

## Tamagui & design system

- **Package:** `packages/design-system`
- **Compiled output:** `tamagui-build` → `dist/` + `types/` (via `turbo build` or optional `bun run build` in that package)
- **Production CSS:** `bun run generate:css` writes `apps/payload-multi-tenant-template/public/tamagui.generated.css` (app **`prebuild`** runs this before the production Payload build)
- **Next integration:** `withDesignSystem` from `@dappermountain/design-system/next-plugin` in `apps/payload-multi-tenant-template/next.config.ts`
- **App usage:** import primitives from `@dappermountain/design-system`; wrap client trees with **`DesignSystemProvider`** from `@dappermountain/design-system/next` (see `src/app/(frontend)/_components/providers.tsx`)

See **[`apps/payload-multi-tenant-template/docs/DESIGN_SYSTEM.md`](apps/payload-multi-tenant-template/docs/DESIGN_SYSTEM.md)** for import rules and ESLint restrictions.

After changing Tamagui config or tokens, run **`bunx turbo build --filter=@dappermountain/design-system`** (or `generate:css` + a manual package build if you prefer working atomically).

---

## Useful commands

### Root

| Command | Purpose |
|---------|---------|
| `bun install` | Install all workspaces; install commit-msg hooks |
| `bun run hooks:install` | Re-install git hooks from `git-hooks.config.ts` |
| `bun run lint` | ESLint via Turborepo |
| `bun run format` | Prettier across the repo |
| `bunx turbo build` | Build all workspaces (respects `^build` order) |
| `bunx turbo build --filter=@dappermountain/payload-multi-tenant-template...` | App + upstream deps |
| `bun run skills:update` | Refresh vendored Payload agent skill |
| `./scripts/up.sh` | Start Docker Compose stack |

### App (`apps/payload-multi-tenant-template`)

| Command | Purpose |
|---------|---------|
| `bun dev` | Payload dev server (port **3000**; runs via `@payloadcms/next` / `next dev`) |
| `bun run build` | Production Payload app build (`next build` + Payload) |
| `bun run start` | Serve built Payload app (`next start`) |
| `bun run payload` | Payload CLI (migrations, types, etc.) |
| `bun run generate:types` | Regenerate Payload TypeScript types after schema changes |
| `bun run generate:importmap` | Regenerate Payload admin import map |
| `bun run generate:schema` | GraphQL schema generation |
| `bun run lint` | ESLint |
| `bun test` | All app tests — `bunfig.toml` + `.env.test` ([docs](./apps/payload-multi-tenant-template/docs/TESTING.md)) |
| `bun test ./src/collections` | Collection integration tests (Postgres) |

---

## Deployment

Production images use the app **`Dockerfile`** (prune → build → standalone). **`fly.toml`** is included for **[Fly.io](https://fly.io)** — adjust regions, app name, and secrets to match your project.

---

## Troubleshooting

- **Compose / DB not ready:** wait for the `db` service healthcheck before hitting the app; verify `DATABASE_*` variables match `.env` and `compose.yml`.
- **Tamagui / frontend errors after DS changes:** run `bun run generate:css` in `packages/design-system`, then rebuild the Payload app.
- **Port conflicts:** change host ports in `compose.yml` if `3001` or `5442` are taken.

---

## More detail

| Doc | Contents |
|-----|----------|
| [`apps/payload-multi-tenant-template/README.md`](apps/payload-multi-tenant-template/README.md) | App URLs, env, scripts, structure |
| [`apps/payload-multi-tenant-template/docs/`](apps/payload-multi-tenant-template/docs/) | Conventions, testing, design system |
| [`docs/COMMITS.md`](docs/COMMITS.md) | Commit format and hooks |
