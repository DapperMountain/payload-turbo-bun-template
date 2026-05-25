# payload-turbo-bun-template

Monorepo template for **[Payload CMS 3](https://payloadcms.com)** on **[Next.js](https://nextjs.org)** (App Router), using **[Bun](https://bun.sh)** and **[Turborepo](https://turborepo.com)**. It includes a shared **[Tamagui](https://tamagui.dev)** design system, **PostgreSQL** (TimescaleDB image), and **Docker**-based local development.

---

## What’s in the stack

| Layer | Choice |
|--------|--------|
| Runtime & package manager | **Bun** (`packageManager` pinned in root `package.json`) |
| Monorepo orchestration | **Turborepo** — `build` depends on upstream packages (`^build`) |
| CMS | **Payload 3** with Postgres via `@payloadcms/db-postgres` |
| App framework | **Next.js** — admin under `app/(payload)`, optional Tamagui frontend under `app/(frontend)` |
| UI (shared) | **`@dappermountain/design-system`** — Tamagui 2 (config v5), `tamagui-build`, `withDesignSystem` Next plugin |
| Database (local) | **TimescaleDB** (`timescale/timescaledb`, PostgreSQL 17) via root `compose.yml` |
| Containers | **Docker Compose** — app service + DB; helper script `./scripts/up.sh` |

---

## Repository layout

```text
apps/
  payload-multi-tenant-template/    # Next.js + Payload app (main template)
packages/
  design-system/                    # Tamagui config, components, DesignSystemProvider, next-plugin
  typescript-config/               # Shared TS configs
  dependencies/
    react/                          # Pinned React, React DOM, and Next.js
    payload/                        # Payload stack (depends on react-deps)
scripts/
  up.sh, common.sh                  # Docker Compose helpers
compose.yml                         # App + Postgres services
```

Apps depend on **`@dappermountain/payload-deps`** and **`@dappermountain/design-system`**. Dependency bundles keep versions centralized for multiple apps.

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

- **[Bun](https://bun.sh)** (match root `packageManager`, e.g. `1.3.13`)
- **[Git](https://git-scm.com/)** (commit-msg lint installs on `bun install` via [bun-git-hooks](https://www.npmjs.com/package/bun-git-hooks))
- For Docker workflow: **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (or compatible Engine + Compose)

---

## Quick start with Docker (recommended for a full stack)

The Compose project name is **`payload-turbo-bun-template`** (see `scripts/common.sh`).

1. **Clone** the repository.

2. **Environment file** — copy the app example env and adjust (database URL, secrets, seed flags):

   ```bash
   cp apps/payload-multi-tenant-template/.env.example apps/payload-multi-tenant-template/.env
   ```

   Set `DATA_SEED_ENABLED=1` if you want a seeded database on first run.

3. **Start services** from the repo root:

   ```bash
   ./scripts/up.sh
   ```

   This runs `docker compose -f compose.yml up -d` with BuildKit enabled.

4. **Open the app** — Compose maps the app container port **3000** to host **`http://localhost:3001`**.

   - Admin: **`http://localhost:3001/admin`**
   - Frontend route group (if used): **`http://localhost:3001/`**

5. **Database** — Postgres listens on host **`localhost:5442`** (container `5432`).

The app container bind-mounts the repo to `/app` and runs `bun install && bun dev`, so edits under `./apps/payload-multi-tenant-template/src` (and workspace packages) hot-reload without rebuilding the image for day-to-day work.

---

## Local development without the app container

Use this when you run Next on the host and only use Docker for Postgres (or your own DB).

1. Install dependencies **from the monorepo root**:

   ```bash
   bun install
   ```

2. Ensure **`apps/payload-multi-tenant-template/.env`** exists and `DATABASE_URL` points at your database (e.g. `localhost:5442` if DB is running via Compose).

3. Run the app (from the app directory, or use Turborepo filter):

   ```bash
   cd apps/payload-multi-tenant-template
   bun dev
   ```

   Or from root, if you add a `turbo dev` pipeline for the app:

   ```bash
   bunx turbo dev --filter=@dappermountain/payload-multi-tenant-template
   ```

---

## Building for production

From the **repository root**, build the app and its dependencies (design-system builds first via `turbo`):

```bash
bun install
bunx turbo build --filter=@dappermountain/payload-multi-tenant-template...
```

The `...` suffix includes upstream workspace packages (e.g. `@dappermountain/design-system`).

To build only from the app folder, upstream packages should already be built:

```bash
cd apps/payload-multi-tenant-template
bun run build
```

Next is configured with **`output: 'standalone'`** for slimmer deploy images. The **`Dockerfile`** under `apps/payload-multi-tenant-template/` uses **`turbo prune`** and a multi-stage **Bun** image for production-style images (distinct from the dev Compose command that runs `bun dev`).

---

## Tamagui & design system

- **Package:** `packages/design-system`
- **Build:** `bun run build` in that package (`tamagui-build` → `dist/`, generated `types/`)
- **Next integration:** `withDesignSystem` from `@dappermountain/design-system/next-plugin` in `apps/payload-multi-tenant-template/next.config.ts` (config path resolved inside the package)
- **App usage:** import primitives from `@dappermountain/design-system`; wrap client trees with **`DesignSystemProvider`** (see `apps/.../design-system-root.tsx`)

After changing Tamagui config or tokens, rebuild the design-system package (or rely on `turbo build` from root).

---

## Useful commands (app)

Run from **`apps/payload-multi-tenant-template`** unless noted:

| Command | Purpose |
|---------|---------|
| `bun dev` | Next dev server |
| `bun run build` | Production Next build |
| `bun run start` | Start production server |
| `bun run generate:types` | Regenerate Payload TypeScript types after schema changes |
| `bun run generate:importmap` | Regenerate Payload admin import map |
| `bun run generate:schema` | GraphQL schema generation |
| `bun run lint` | ESLint |
| `bun test` | All app tests — `bunfig.toml` + `.env.test` ([docs](./apps/payload-multi-tenant-template/docs/TESTING.md)) |
| `bun test ./src/collections` | Collection integration tests (Postgres) |

Root:

| Command | Purpose |
|---------|---------|
| `bun install` | Install all workspaces |
| `cd apps/payload-multi-tenant-template && bun test` | Run tests from the app workspace |
| `bunx turbo build` | Build per `turbo.json` |
| `bunx turbo lint` | Lint across packages |

---

## Deployment

The app includes **`fly.toml`** for **[Fly.io](https://fly.io)**. Adjust regions, app name, and secrets to match your project.

---

## Troubleshooting

- **Compose / DB not ready:** wait for the `db` service healthcheck before hitting the app; verify `DATABASE_*` variables match `.env` and `compose.yml`.
- **Tamagui / Next errors after DS changes:** run `bun run build` in `packages/design-system`, then rebuild the app.
- **Port conflicts:** change host ports in `compose.yml` if `3001` or `5442` are taken.

---

## More detail

See **`apps/payload-multi-tenant-template/README.md`** for app-specific notes (seeding, admin URL, acknowledgments).
