# Database, migrations, and seeding

## Adapter

**PostgreSQL only** via `@payloadcms/db-postgres` (Drizzle). Do not use MongoDB examples from upstream docs for this app.

Configured in `config/payload.ts`:

- `migrationDir`: `src/database/migrations`
- `prodMigrations`: exported from `src/database/migrations/index.ts`
- `pool`: `postgresPoolOptions(config.database)` — URI, `DATABASE_POOL_MAX`, `DATABASE_SSL`

## Migrations

| Command | When |
|---------|------|
| `bun run db:migrate:create` | After schema changes that need a new migration file |
| `bun run db:migrate:run` | Apply migrations (e.g. CI, production) |

**Development**: prefer `payload db:watch` for faster feedback instead of re-running migrate on every change.

Migration files live in `src/database/migrations/` (`.ts` + companion `.json` from Payload).

## Seeding

Entry: `src/database/seed/index.ts`, invoked from `onInit` in `config/payload.ts`.

### Enable / disable

Controlled by Zod config: `config.database.seed.enabled` ← env `DATA_SEED_ENABLED`.

When disabled, seed loop returns immediately (no seed data written).

### Adding seeders

Register in the `seeders` array in `seed/index.ts`:

```typescript
const seeders = [{ name: 'Users', seedFunction: addUsers }]
```

Implement each seeder under `src/database/seed/` (e.g. `Users.ts`). Use `payload.logger` for progress; errors are logged per seeder.

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
