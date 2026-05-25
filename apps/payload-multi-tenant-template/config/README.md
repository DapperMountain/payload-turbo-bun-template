# App configuration (`@config`)

Runtime settings come from **environment variables**, validated with **Zod** at startup.

```typescript
import config from '@config'
```

Payload collection types: `@/types` (`Config`). App env types: `AppConfig` (Zod parse) / `AppConfigWithFlags` (default `@config` export).

## Layout

```text
config/
├── README.md              # This file — env var reference
├── index.ts               # Public facade (@config)
├── payload.ts             # Payload buildConfig (@payload-config)
│
├── app/                   # Zod env config (internal parsers)
│   ├── index.ts           # Parsed singleton (@config default export)
│   ├── schema.ts          # Zod shape
│   ├── load.ts            # Zod parse → AppConfig
│   ├── parsers/           # env field parsers (no index barrel)
│   │   ├── parsers.spec.ts
│   │   ├── helpers.ts
│   │   ├── server.ts
│   │   ├── database.ts
│   │   └── seed.ts
│   └── helpers/           # internal utilities (no index barrel)
│       ├── prepare-env.ts      # .env / .env.local / .env.test (test runs)
│       ├── is-test-runtime.ts
│       └── config-flags.ts     # isTest, baseURL alias
│
└── adapters/              # AppConfig → library options (config/ only)
    └── postgres-pool.ts   # Used by payload.ts
```

**Import rules**

| From | Import |
|------|--------|
| `src/**`, tests | `@config` only |
| `config/payload.ts` | `@config` + `./adapters/*` |
| `config/app/**` | Relative paths to concrete files (e.g. `./helpers/prepare-env`, `./parsers/helpers`) |
| `config/adapters/**` | `../app/parsers/database`, `../app/parsers/helpers`, etc. |

Do not import `@config/app/parsers/...` from application code. The `parsers/` folder has no `index.ts` (internal-only; see code conventions).

## Environment variables

### Always required

| Variable | Config path | Purpose |
|----------|-------------|---------|
| `NODE_ENV` | `config.env` | `development` \| `test` \| `production` |
| `NEXT_PUBLIC_SERVER_URL` | `config.server.publicURL` | Public/browser URL (also `config.baseURL`) |
| `DATABASE_URL` | `config.database.uri` | PostgreSQL (see test below) |
| `PAYLOAD_SECRET` | `config.payload.secret` | Payload signing / encryption |

### Server (optional)

| Variable | Config path | Default |
|----------|-------------|---------|
| `SERVER_URL` | `config.server.serverURL` | Same as `NEXT_PUBLIC_SERVER_URL` |
| `CORS_ORIGINS` | `config.server.corsOrigins` | `[publicURL]` only |
| `TRUST_PROXY` | `config.server.trustProxy` | `true` in production, else `false` |

`CORS_ORIGINS` is comma-separated. The public URL is always included.

`TRUST_PROXY` is parsed for Fly/nginx; Next/Payload routing may use platform settings separately.

### Database (optional)

| Variable | Config path | Default |
|----------|-------------|---------|
| `DATABASE_URL_TEST` | `config.database.uri` when `NODE_ENV=test` | Falls back to `DATABASE_URL` |
| `DATABASE_SSL` | `config.database.ssl` | `disable` (`prefer` \| `require`) |
| `DATABASE_POOL_MAX` | `config.database.poolMax` | `10` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | When `ssl=require` | `true` |

When `NODE_ENV=test`, set **`DATABASE_URL_TEST`** so integration tests do not truncate dev data.

### Seeding (optional)

| Variable | Config path |
|----------|-------------|
| `DATA_SEED_ENABLED` | `config.database.seed.enabled` (default **off** when unset) |
| `DATA_SEED_ADMIN_*` / `DATA_SEED_USER_*` | Required only when seeding is enabled |

When `NODE_ENV=test`, seeding is **always off** in `parseSeedConfig` (even if `.env` has `DATA_SEED_ENABLED=1`).

### Tests (`bun test`)

Before Zod runs, `prepareEnvForConfig()` loads `.env` and `.env.local` (unset keys only). During `bun test`, it also loads `.env.test` when present. Same `appConfigSchema` as dev/prod — no separate test schema. See [`.env.test.example`](../.env.test.example) (local) and [`docs/TESTING.md`](../docs/TESTING.md); CI/Docker inject the same keys via the environment.

### Feature flags (optional)

| Variable | Config path | Default |
|----------|-------------|---------|
| `PAYLOAD_TELEMETRY_ENABLED` | `config.features.telemetry` | `false` |
| `GRAPHQL_ENABLED` | `config.features.graphql` | `true` |
| `MCP_ENABLED` | `config.features.mcp` | `true` |

When enabled, `mcpPlugin` in `payload.ts` exposes `users` and `tenants` at `/api/mcp`. See [`docs/MCP.md`](../docs/MCP.md).

## Runtime helpers

| Property | Meaning |
|----------|---------|
| `config.isProduction` | `env === 'production'` |
| `config.isDevelopment` | `env === 'development'` |
| `config.isTest` | `env === 'test'` |
| `config.baseURL` | Alias of `config.server.publicURL` |

## Client vs server URLs

`NEXT_PUBLIC_*` is embedded in the Next.js client bundle. Server code should use `config.server.publicURL`.

## Copy / role labels

Use `@/lang` (`custom`), not `@config`.

## Adding a setting

1. `.env.example` + this table  
2. Parser in `app/parsers/`  
3. Field in `app/schema.ts`  
4. Wire in `payload.ts` or app code (adapter if mapping to a library)
