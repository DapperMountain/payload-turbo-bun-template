# Project layout and configuration

## Directory layout

See **[`docs/CODE_CONVENTIONS.md`](../../../docs/CODE_CONVENTIONS.md)** for folder-per-collection layout, barrel `index.ts` imports, and TSDoc standards.

```text
apps/accounting-for-life/
├── config/
│   ├── index.ts          # Zod-validated env + seed (@config)
│   └── payload.ts        # buildConfig (@payload-config)
├── docs/
│   └── CODE_CONVENTIONS.md
├── src/
│   ├── types.ts          # Generated Payload types (not payload-types.ts)
│   ├── collections/      # One folder per collection + hooks/
│   ├── access/
│   ├── database/
│   │   ├── migrations/
│   │   └── seed/
│   ├── lang/
│   ├── endpoints/
│   └── app/
│       ├── (frontend)/   # Public site — layout.tsx, page.tsx, _components/, actions/
│       └── (payload)/    # Admin + API routes
└── .agents/skills/
    └── accounting-for-life-app/   # This app overlay (Payload skill is at repo root)
```

## Path aliases and config entry

| Import | Resolves to |
|--------|-------------|
| `@payload-config` | `config/payload.ts` |
| `@config` | `config/index.ts` (parsed Zod config) |
| `@/…` | `src/…` |

`PAYLOAD_CONFIG_PATH` is set in `bunfig.toml` → `config/payload.ts`.

## Payload config (`config/payload.ts`)

- **Database**: `@payloadcms/db-postgres`, `idType: 'uuidv7'`
- **Plugin**: `multiTenantPlugin` — see [MULTI-TENANT.md](MULTI-TENANT.md)
- **Editor**: Lexical
- **Types**: `typescript.outputFile` → `src/types.ts`
- **GraphQL**: `schemaOutputFile` → `src/schema.graphql`
- **i18n / localization**: wired from `@/lang` — see [I18N.md](I18N.md)
- **Lifecycle**: `onInit` calls `seed(payload)` — see [DATABASE.md](DATABASE.md)
- **CORS / CSRF / server URL**: `config.server.corsOrigins`, `config.server.serverURL` from `@config`

## App config (`@config`)

- **Reference:** [`config/README.md`](../../../config/README.md) — env var table
- **Schema:** `config/app/schema.ts` (Zod 4); parsers in `config/app/parsers/`
- Exports `AppConfig` and default `config` (parsed at import)
- **Prefer `@config`** over raw `process.env` where possible, especially for secrets, DB URI, and flags
- **Copy / role labels:** `@/lang` (`custom`), not Zod config

### Seed-related env (see [DATABASE.md](DATABASE.md))

- `DATA_SEED_ENABLED` — when false, seed user vars are not required
- `DATA_SEED_ADMIN_*` and `DATA_SEED_USER_*` — required only when seeding is enabled

## Generated types

After collection/global schema changes:

```bash
bun run generate:types
```

Import from `@/types` — **not** `@/payload-types`. Do not barrel-export generated types.

## Plugins: installed vs configured

| Package | Registered in `buildConfig` |
|---------|----------------------------|
| `@payloadcms/plugin-multi-tenant` | Yes |
| `@payloadcms/plugin-mcp` | Yes — [`config/payload.ts`](../../../config/payload.ts) (`plugins`), [`docs/MCP.md`](../../../docs/MCP.md) |
| `@payloadcms/plugin-seo` | No (dependency only) |

Website-template plugins (redirects, search, form-builder, nested-docs) are **not** in this app.

## API-first ledger

Domain rules for transactions, envelopes, and budgets live in **collection hooks**, not Next.js server actions. The virtual `entries` field on `transactions` is the read/write contract for posting legs; `transaction-entries` are hook-derived rows in a separate collection for queryability.

See **[`docs/API_FIRST.md`](../../../docs/API_FIRST.md)** for REST examples, hook pipeline, and what belongs in `app/(frontend)/actions/`.

## Code validation

| Task | Command |
|------|---------|
| Typecheck | `bunx tsc --noEmit` |
| Import map | `bun run generate:importmap` |
| GraphQL schema | `bun run generate:schema` |
| Tests | `bun test` from this app directory — [`docs/TESTING.md`](../../../docs/TESTING.md) (`bunfig.toml`, `.env.test` locally; CI injects env) |

## Next.js

`next.config.ts` composes `withPayload` and `withDesignSystem`. Frontend lives under `src/app/(frontend)/` and imports UI from `@dappermountain/design-system` only — see [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md).
