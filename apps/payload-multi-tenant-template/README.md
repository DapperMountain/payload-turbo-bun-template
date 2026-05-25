# Payload multi-tenant template (app)

Next.js **App Router** application: **Payload 3** admin and APIs, optional **design-system** frontend (`src/app/(frontend)`), **multi-tenant** plugin, **Lexical** rich text, **SEO** plugin, **Zod**-validated config, and **Drizzle**/Postgres via Payload’s adapter.

This package is **`@dappermountain/payload-multi-tenant-template`** inside the monorepo. Shared UI lives in **`@dappermountain/design-system`**; Payload/Next/React versions are pulled through **`@dappermountain/payload-deps`**.

---

## URLs & ports

| Environment | App URL | Admin |
|-------------|---------|--------|
| **Docker Compose** (root `compose.yml`) | `http://localhost:3001` | `http://localhost:3001/admin` |
| **Local `bun dev`** (default Next port) | `http://localhost:3000` | `http://localhost:3000/admin` |

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

Then open **`http://localhost:3001/admin`**. The repo is mounted into the container; changes under `src/` and workspace packages reload via `bun dev`.

### Option B — Next on the host

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

Prefer running a full monorepo build from the **repo root** so `design-system` compiles first:

```bash
bun install
bunx turbo build --filter=@dappermountain/payload-multi-tenant-template...
```

Or, after dependencies are built:

```bash
cd apps/payload-multi-tenant-template
bun run build
bun run start
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Next development server |
| `bun run build` | `next build` (standalone output) |
| `bun run start` | `next start` |
| `bun run payload` | Payload CLI |
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

The **`Dockerfile`** here is used by root **`compose.yml`** for the **dev** service command (`bun dev`). For **deployable** images, the same Dockerfile is set up for **`turbo prune`**, **`bun install`**, **`turbo build`**, and **Next standalone** output (see Dockerfile stages). Adjust `CMD` / orchestration for your host (Kubernetes, Fly, etc.).

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
- **React Compiler** enabled in Next config (see `babel-plugin-react-compiler` / Next options)  

---

## Acknowledgments

**[payload-tools](https://github.com/teunmooij/payload-tools)** — parts of the access model were adapted from **[payload-rbac](https://github.com/teunmooij/payload-tools/tree/main/packages/rbac)**.
