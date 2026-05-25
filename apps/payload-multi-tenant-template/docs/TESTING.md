# Testing

Bun test runner, app [`bunfig.toml`](../bunfig.toml), and local [`.env.test`](../.env.test.example). No test scripts in `package.json`.

## Layers

| Layer | Needs Postgres | Typical location | What it proves |
|-------|----------------|------------------|----------------|
| **Unit** | No | `src/access/`, `src/utils/`, `config/app/` | Access policies, parsers, pure helpers |
| **Integration** | Yes | `src/collections/<Name>/` | Collection wiring, CRUD smoke, DB constraints |

Unit tests are fast and DB-free. Integration tests boot Payload + Postgres and are **not** a substitute for access/utils unit coverage.

## Running tests

From `apps/payload-multi-tenant-template`:

| Goal | Command |
|------|---------|
| Full suite | `bun test` |
| Unit — access | `bun test ./src/access` |
| Unit — config | `bun test ./config/app` |
| Unit — utils | `bun test ./src/utils` |
| Integration — collections | `bun test ./src/collections` |

[`bunfig.toml`](../bunfig.toml) `[test] preload` runs `src/test/preload.ts`: loads env files, then the Payload harness (**skipped** for unit-only paths above).

### Local setup

1. Copy [`.env.test.example`](../.env.test.example) → `.env.test` (gitignored).
2. Start Postgres: root `compose.yml` — **`db`** (5442), **`db-test`** (5443).
3. Migrate the test DB: `bun --env-file .env.test run payload migrate`.
4. Run tests (`bun test` or a scoped command above).

Unit-only commands do not need a running database.

### CI / Docker / hosted environments

Do **not** rely on `.env.test` on disk. Inject the same variables (`NODE_ENV=test`, `DATABASE_URL_TEST`, `PAYLOAD_SECRET`, …) via the platform. Shell/platform env always wins over file values.

### Integration prerequisites

1. `NODE_ENV=test` (from `.env.test` locally or CI env).
2. Postgres at `DATABASE_URL_TEST` (see `.env.test.example`, **`db-test`** port **5443**).
3. Migrations applied on the test database.

`afterAll` in `src/test/config.ts` **truncates all tables** in the test DB. Never point `DATABASE_URL_TEST` at dev data you care about.

## Where tests live

| Kind | Location | Naming |
|------|----------|--------|
| Unit — access policy | `src/access/collections/` | `<slug>.access.spec.ts` |
| Unit — shared access | `src/access/<folder>/` | `<folder>.spec.ts` |
| Unit — utils | `src/utils/` | `<module>.spec.ts` |
| Unit — config parsers | `config/app/` | `*.spec.ts` |
| Integration — collections | `src/collections/<Name>/` | `<slug>.integration.spec.ts` |
| Harness | `src/test/` | No `*.spec.ts` — `preload.ts`, `config.ts`, `helpers.ts` |

Co-locate specs with the code they exercise. Do **not** put integration tests under `src/access/`.

## Unit tests

- **Access:** `expectAccess` from `@/access/test`; one behavior per `it`. See [`src/access/README.md`](../src/access/README.md).
- **Config:** parser specs in `config/app/parsers/`.
- **Utils:** co-located `*.spec.ts` under `src/utils/`.

Naming and TSDoc rules: [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md#tests).

## Integration tests

Boot **Payload + Postgres**; real `create` / `find` / `update` / `delete`.

**Do test**

- Collection wiring: required fields, virtual fields, plugin fields, auth options.
- Hooks that change persisted data (when enabled).
- Happy-path CRUD (create → read → update → delete).
- One meaningful invariant per `it`.

**Do not test here**

- Access rules — `src/access/collections/<slug>.access.spec.ts`.
- Pure helpers — `src/utils/*.spec.ts`.
- Every collection by default — add when **critical** or **non-trivial**.

### Standard integration file shape

```typescript
import { describe, expect, it } from 'bun:test'

import type { Tenant } from '@/types'
import { createTenant, deleteResourceById, findResourceByKey, payload } from '@/test'

describe('tenants collection', () => {
  let resourceId: string

  it('creates a document with expected fields', async () => {
    const doc = await createTenant(payload, {
      name: 'Test Tenant',
      description: 'Integration smoke',
      domain: 'integration.example.com',
    })
    resourceId = doc.id
    expect(doc.name).toBe('Test Tenant')
  })

  it('reads the document back', async () => {
    const doc = await findResourceByKey<Tenant>(payload, 'tenants', 'name', 'Test Tenant')
    expect(doc.id).toBe(resourceId)
  })

  // update, delete …
})
```

### Integration conventions

1. **File name** — `<collection-slug>.integration.spec.ts` next to the collection config.
2. **Import `payload` from `@/test`** — preload handles setup/teardown; do not call `getPayload` per file.
3. **Use `@/test` helpers** — factories in `src/test/helpers.ts` (`createTenant`, `createUser`, …).
4. **`overrideAccess: true`** on Local API unless the test explicitly verifies access.
5. **Order** — tests in one file share DB state until `afterAll` truncates.
6. **Names** — plain-English `it` titles (see [CODE_CONVENTIONS.md](./CODE_CONVENTIONS.md)).

### When to add an integration spec

Add when behavior needs the DB (constraints, migrations, field types) or the collection is non-trivial (auth, plugins, hooks). Skip thin config re-exports covered by unit tests.

## Coverage today

| Area | Spec |
|------|------|
| `tenants` (integration) | `src/collections/Tenants/tenants.integration.spec.ts` |
| Access / utils / config | See `src/access/`, `src/utils/`, `config/app/` |

`users` has no integration spec yet; `createUser` exists in `src/test/helpers.ts` for when you add one.
