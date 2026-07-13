# Database, migrations, and seeding

## Adapter

**PostgreSQL only** via `@payloadcms/db-postgres` (Drizzle). Do not use MongoDB examples from upstream docs for this app.

Configured in `config/payload.ts`:

- `migrationDir`: `src/database/migrations`
- `prodMigrations`: exported from `src/database/migrations/index.ts` (empty until first production deploy; dev uses schema push)
- `pool`: `postgresPoolOptions(config.database)` — URI, `DATABASE_POOL_MAX`, `DATABASE_SSL`

## Migrations

| Command | When |
|---------|------|
| `bun run db:migrate:create` | After schema changes that need a new migration file (production deploy) |
| `bun run db:migrate:run` | Apply migrations (CI, production) |
| `bun run db:push` | **Development:** sync Postgres to the current Payload config (Drizzle push) |

**Development (not deployed):** `prodMigrations` is empty. Payload pushes schema on connect when `NODE_ENV !== 'production'`. Use `bun run db:push` from the host (`DATABASE_URL` → `localhost:5442`) after collection/field renames.

After a wipe (`PAYLOAD_DROP_DATABASE=true bun run db:push`), users and demo data seed automatically when `DATA_SEED_ENABLED=1`. Otherwise run `bun run db:seed all` (requires `DATA_SEED_*` in `.env`).

**Wipe dev data and recreate tables** (undeployed only):

```bash
PAYLOAD_DROP_DATABASE=true DATABASE_URL=postgres://payload:payload@localhost:5442/payload bun run payload migrate:status
bun run db:push
```

Or `docker compose down -v` and restart the stack (empty volume → push on first boot).

**Production:** prefer `db:migrate:create` + `db:migrate:run`; do not rely on push.

## Seeding

Entry: `src/database/seed/index.ts`, invoked from `onInit` in `config/payload.ts`.

### Enable / disable

Controlled by Zod config: `config.database.seed.enabled` ← env `DATA_SEED_ENABLED`.

When disabled, seed loop returns immediately (no seed data written).

### Adding seeders

Register in the `seeders` array in `seed/index.ts`:

```typescript
const seeders = [
  { name: 'Users', seedFunction: seedUsers },
  { name: 'Workspaces', seedFunction: seedWorkspaces },
  { name: 'Budgets', seedFunction: seedBudgets },
]
```

Implement each seeder as a single `index.ts` under `src/database/seed/<area>/` (see `users/`). Use `payload.logger` for progress; errors are logged per seeder.

```text
database/seed/
├── index.ts           # orchestrator (onInit)
├── users/index.ts     # seedUsers
├── workspaces/index.ts  # seedWorkspaces (demo household)
├── budgets/index.ts   # seedBudgets
└── categories/index.ts  # seedCategories (also called from collection hooks)
```

Each seeder file owns its static data and insert logic. **`onInit` seeders** register in `seed/index.ts` and check `config.database.seed.enabled`. **`seedCategories`** is also invoked from `collections/Budgets/hooks` on budget create (not gated by `DATA_SEED_ENABLED`).

**Workspace seed** (`seed/workspaces/`): creates **Demo Household** (`localhost:3001`) and **Lake Cabin** (`cabin.localhost`) so the admin workspace selector is usable (requires 2+ workspaces). Links the `DATA_SEED_USER` account as `WORKSPACE_ADMIN` on both when user seed env is enabled.

**Budget seed** (`seed/budgets/`): for the demo household, creates **Household** (default) and **Vacation** budgets; other workspaces get a single **Personal** budget. The budget `afterChange` hook calls `seedCategories` from `seed/categories/`.

### Manual seeders (`DATA_SEED_ENABLED` off)

Run one seeder without enabling full `onInit` seeding:

```bash
cd apps/accounting-for-life
bun run db:seed all          # users → workspaces → budgets → ledger (after a fresh db:push)
bun run db:seed repair      # remove duplicate budgets / catalog rows
bun run db:seed users        # admin@example.com + user@example.com only
bun run db:seed workspaces   # Demo Household (localhost:3001)
bun run db:seed budgets        # Household + Vacation on demo → categories via hook
bun run db:seed categories   # backfill groups + categories for existing budgets
bun run db:seed categories --budget=<uuid>
bun run db:seed ledger       # USD unit, Checking + Savings, sample transfer (Demo Household)
```

**Ledger seed** (`seed/ledger/`): per workspace, creates a **USD** unit and **Checking** + **Savings** accounts on the default budget. On **Demo Household**, also posts a sample **transfer** transaction so **Accounts** and **Transactions** lists are non-empty in admin.

Implemented as a Payload bin script (`payload seed` in `config/payload.ts`). `categories` and `ledger` are never gated by `DATA_SEED_ENABLED`. Creating a budget in admin also runs `seedCategories` via the collection hook.

When the app runs in Docker, run this **from the host** with a `DATABASE_URL` that reaches Postgres on `localhost:5442` (the compose `db` hostname only works inside the network).

`users` still requires `DATA_SEED_*` env vars (parsed only when `DATA_SEED_ENABLED` is true).

### Seed user credentials

Defined in `config/index.ts` via `zUserSeed('DATA_SEED_ADMIN')` and `zUserSeed('DATA_SEED_USER')` — env vars:

- `DATA_SEED_ADMIN_EMAIL`, `_FIRST_NAME`, `_LAST_NAME`, `_PASSWORD`
- `DATA_SEED_USER_*` (same suffix pattern)

## Test database

When `NODE_ENV=test`, `config.database.uri` uses **`DATABASE_URL_TEST`** if set, otherwise `DATABASE_URL`. Migrations, seeding, and Payload all use the same code paths — only the connection target changes.

Optional separate Postgres: root `compose.yml` service **`db-test`** (host port **5443**).

**Local:** copy [`.env.test.example`](../../../.env.test.example) → `.env.test` (includes `DATABASE_URL_TEST` for host port 5443). Run `bun test` from the app directory; [`bunfig.toml`](../../../bunfig.toml) preloads `src/test/preload.ts`.

**CI / Docker:** inject `NODE_ENV=test`, `DATABASE_URL_TEST`, and other keys via the platform (no `.env.test` file in the image — see root `.dockerignore`).

Seeding is always off when `NODE_ENV=test` (`parseSeedConfig`). If `DATABASE_URL_TEST` is unset, tests use `DATABASE_URL` and log a warning.

## Transactions and hooks

When seeders or hooks call Payload Local API (`create`, `update`, `delete`, etc.):

- **Always pass `req`** to nested operations inside hooks for atomicity.
- For user-scoped Local API calls, set `overrideAccess: false` when passing `user`.

See root `.agents/skills/payload/SKILL.md` (Security Pitfalls) and `.agents/rules/security-critical.mdc`.
