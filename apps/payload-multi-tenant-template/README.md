# Payload multi-tenant template (app)

**Payload CMS 3** application (hosted on **Next.js** via **`@payloadcms/next`**): admin and REST/GraphQL APIs, optional **design-system** frontend (`src/app/(frontend)`), **multi-tenant** plugin, **Lexical** rich text, **SEO** plugin, **Zod**-validated config, and **Drizzle**/Postgres via Payload’s adapter.

This package is **`@dappermountain/payload-multi-tenant-template`** inside the monorepo.

- **Shared UI:** workspace package **`@dappermountain/design-system`** (`packages/design-system`)
- **Payload stack:** declared in this app’s `package.json` (`payload`, `@payloadcms/*`)
- **Next / React:** hoisted from the **root** workspace for **`@payloadcms/next`** (install from repo root with `bun install`)

Monorepo overview, Docker, and Turborepo build flow: **[`../../README.md`](../../README.md)**.

---

## URLs & ports

| Environment | App URL | Admin |
|-------------|---------|--------|
| **Docker Compose** (root `compose.yml`) | `http://localhost:3001` | `http://localhost:3001/admin` |
| **Local `bun dev`** (Payload dev; default port 3000) | `http://localhost:3000` | `http://localhost:3000/admin` |

Compose maps host **3001 → container 3000**. Postgres is exposed on host **5442** when using the root compose file.

---

## Environment

1. Copy the example file **in this directory**:

   ```bash
   cp .env.example .env
   ```

2. Set **`DATABASE_URL`** (and other vars) to match your database. With root Docker Compose, credentials default to those in `compose.yml` / `.env`.

3. **`DATA_SEED_ENABLED=1`** — enable if you want seed data on startup (adjust seed scripts under `src` as needed).

4. If seeding is off, Payload will prompt you to create the first user at `/admin`.

---

## Development

### Option A — Full stack with Docker (from monorepo root)

Best match for “works the same on every machine.”

```bash
# From repository root
cp apps/payload-multi-tenant-template/.env.example apps/payload-multi-tenant-template/.env
./scripts/up.sh
```

Then open **`http://localhost:3001/admin`**. The repo is mounted into the container; changes under `src/` and workspace packages reload via **`bun dev`** (Payload dev server).

### Option B — Payload on the host

```bash
# From repository root
bun install

# This app only
cd apps/payload-multi-tenant-template
cp .env.example .env   # if needed
bun dev
```

Use **`http://localhost:3000/admin`** unless you changed the port. Ensure Postgres is reachable at the URL in `.env` (e.g. run only the `db` service from root `compose.yml`).

---

## Build & run (production)

**From the repo root (recommended):** Turborepo runs upstream `build` tasks before this app (`dependsOn: ["^build"]` in root `turbo.json`). You do not need to build `packages/design-system` separately first.

```bash
bun install
bunx turbo build --filter=@dappermountain/payload-multi-tenant-template...
cd apps/payload-multi-tenant-template
bun run start
```

**From this directory only:** `bun run build` runs **`prebuild`** (`generate:css` in design-system) then the production Payload build (`next build` via `@payloadcms/next`). Use this for an atomic app build when `design-system` is already compiled, or after `cd packages/design-system && bun run build`. For full monorepo ordering, use the root `turbo build` command above.

See **[`../../README.md` — Building the monorepo](../../README.md#building-the-monorepo)** for the full picture (whole-repo vs per-package builds).

---

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Payload development server (`next dev` via `@payloadcms/next`) |
| `bun run build` | Production Payload build (`next build`, standalone output) |
| `bun run start` | Serve production build (`next start`) |
| `bun run payload` | Payload CLI (`payload` — migrations, jobs, etc.) |
| `bun run generate:types` | **`payload generate:types`** — run after collection/global schema changes |
| `bun run generate:importmap` | Regenerate admin import map after custom components |
| `bun run generate:schema` | GraphQL schema generation |
| `bun run db:migrate:run` | Run Payload migrations |
| `bun run db:migrate:create` | Create a migration |
| `bun run lint` | ESLint |
| `bun test` | Full suite — [`bunfig.toml`](./bunfig.toml) + `.env.test` (see [Testing](./docs/TESTING.md)) |
| `bun test ./src/collections` | Collection integration smoke tests |
| `bun test ./src/access` | Access unit tests |
| `bun test ./config/app` | Config parser unit tests |
---

## AI agent skills

- **Monorepo entry:** [`../../AGENTS.md`](../../AGENTS.md) — Bun, Turborepo, shared Payload skill.
- **This app:** [`AGENTS.md`](./AGENTS.md) + [`.agents/skills/dapper-payload-app/`](.agents/skills/dapper-payload-app/) (config, DB, multi-tenant, i18n).
- **Payload skill (root, vendored):** `/.agents/skills/payload/` — update from repo root: `bun run skills:update`.
- **Workspace rules (root):** `/.agents/rules/`.

---

## Code conventions

Folder-per-collection layout, barrel `index.ts` imports, and **TSDoc** comment standards are documented in **[`docs/CODE_CONVENTIONS.md`](docs/CODE_CONVENTIONS.md)**. See also [`src/collections/README.md`](src/collections/README.md), [`src/access/README.md`](src/access/README.md), and **[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)** for the public frontend UI package.

## Configuration

Environment variables are validated at startup via Zod. See **[`config/README.md`](config/README.md)** for the full variable list; copy [`.env.example`](.env.example) to `.env`.

---

## Project structure (high level)

```text
src/
  app/
    (frontend)/          # Public design-system shell + pages
    (payload)/           # Payload admin + API routes
  collections/           # Payload collections (folder per collection)
  access/                # Authorization maps and helpers
  ...
config/                  # Payload config entry, env parsing (Zod)
```

**`next.config.ts`** composes **`withPayload`** and **`withDesignSystem`**, and sets `transpilePackages` for `@dappermountain/design-system`.

---

## Docker image (production-style)

The **`Dockerfile`** here serves two roles:

| Mode | How | Image size |
|------|-----|------------|
| **Compose dev** (root `compose.yml`) | Bind-mount repo, `bun dev` | N/A (dev workflow) |
| **Production release** | `turbo prune` → `bun install` → `turbo build` → copy **Next standalone** into Bun Alpine | **Currently under 300MB** |

**Why it stays small:** `turbo prune --docker` limits the build context to this app and its workspace deps (not the entire monorepo). **`output: 'standalone'`** in `next.config.ts` means the final stage only ships the standalone server bundle and static assets — not all of `node_modules` or source from unrelated packages.

Build the release target explicitly (not the default Compose service):

```bash
docker build -f apps/payload-multi-tenant-template/Dockerfile \
  --target release \
  --build-arg PROJECT=@dappermountain/payload-multi-tenant-template \
  --build-arg PROJECT_PATH=apps/payload-multi-tenant-template \
  -t payload-multi-tenant-template:release .
```

Adjust `CMD` / orchestration for your host (Kubernetes, Fly, etc.).

---

## Deployment

**`fly.toml`** is included for Fly.io. Configure secrets (`DATABASE_URL`, `PAYLOAD_SECRET`, etc.) and run `fly deploy` from a context that includes the full monorepo or a pruned build, per your pipeline.

---

## Features (summary)

- **Bun** for install and scripts  
- **Payload 3** + **Postgres** (Drizzle adapter)  
- **Multi-tenant** plugin  
- **Lexical** rich text, **SEO** plugin  
- **Zod**-validated centralized config  
- **Design system** frontend via **`@dappermountain/design-system`**  
- **React Compiler** enabled in `next.config.ts` (Payload + frontend)  

---

## Acknowledgments

**[payload-tools](https://github.com/teunmooij/payload-tools)** — parts of the access model were adapted from **[payload-rbac](https://github.com/teunmooij/payload-tools/tree/main/packages/rbac)**.
