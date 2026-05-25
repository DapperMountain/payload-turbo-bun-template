# Maintaining documentation (payload-multi-tenant-template)

When code changes affect how developers or agents navigate this app, **update the docs in the same change** — see monorepo [`.agents/MAINTAINING_AGENT_CONTEXT.md`](../../../.agents/MAINTAINING_AGENT_CONTEXT.md).

Agents: run this checklist **before marking the task complete**. Do not wait for the user to request doc updates.

## File map (what to update)

| If you changed… | Update these (as applicable) |
|-----------------|------------------------------|
| **`src/` layout** (new area, move collections/access) | [`CODE_CONVENTIONS.md`](CODE_CONVENTIONS.md), [`src/collections/README.md`](../src/collections/README.md), [`src/access/README.md`](../src/access/README.md), [`.agents/skills/dapper-payload-app/reference/PROJECT.md`](../.agents/skills/dapper-payload-app/reference/PROJECT.md) |
| **Path aliases** (`tsconfig` paths, `@config`, `@payload-config`) | `PROJECT.md`, `CODE_CONVENTIONS.md`, `config/README.md` |
| **`config/` or env validation** (Zod schema, parsers, `load.ts`) | [`config/README.md`](../config/README.md), `PROJECT.md`, [`.env.example`](../.env.example), [`.env.test.example`](../.env.test.example), [`DATABASE.md`](../.agents/skills/dapper-payload-app/reference/DATABASE.md) |
| **`package.json` scripts** (dev, migrate, generate — not tests) | [App `README.md`](../README.md), [`AGENTS.md`](../AGENTS.md), `PROJECT.md` (validation table) |
| **Test / env files** (`bunfig.toml`, `.env.test.example`, `src/test/`) | [`TESTING.md`](TESTING.md), `config/README.md`, `DATABASE.md` |
| **Postgres / migrations / seed / test DB** | `DATABASE.md`, `config/README.md`, `.env.example`, `.env.test.example`, root [`compose.yml`](../../../compose.yml) comments if ports/services change |
| **`src/lang` / i18n** | [`reference/I18N.md`](../.agents/skills/dapper-payload-app/reference/I18N.md), `.env.test.example` (if env-related) |
| **Multi-tenant / access** | [`reference/MULTI-TENANT.md`](../.agents/skills/dapper-payload-app/reference/MULTI-TENANT.md), `src/access/README.md`, `CODE_CONVENTIONS.md` |
| **Docker / Next / design system** | App `README.md`, `docs/DESIGN_SYSTEM.md`, root `README.md`, `PROJECT.md` (`next.config.ts` section) |
| **`@dappermountain/design-system` usage** | `docs/DESIGN_SYSTEM.md`, `CODE_CONVENTIONS.md`, app `README.md` |
| **Testing** (unit + integration) | `docs/TESTING.md`, `src/test/preload.ts`, `src/test/config.ts`, `bunfig.toml`, `.env.test.example`, `DATABASE.md`, `CODE_CONVENTIONS.md` (test section) |
| **New collection** | `src/collections/index.ts` pattern, `CODE_CONVENTIONS.md`, `PROJECT.md` if layout diagram changes |

## Keep in sync (pairs)

| Code | Example / mirror |
|------|------------------|
| [`.env.test.example`](../.env.test.example) | Local `.env.test` (gitignored); document CI env parity in `TESTING.md` |
| [`config/README.md`](../config/README.md) env table | [`.env.example`](../.env.example) |
| Skill `reference/*.md` path mentions | Real paths under `apps/payload-multi-tenant-template/` |

## Agent overlay (this app)

| File | Purpose |
|------|---------|
| [`.agents/skills/dapper-payload-app/SKILL.md`](../.agents/skills/dapper-payload-app/SKILL.md) | Entry + reading order |
| `reference/PROJECT.md` | Layout, aliases, config, types |
| `reference/DATABASE.md` | Migrations, seed, test DB |
| `reference/MULTI-TENANT.md` | Plugin + access |
| `reference/I18N.md` | Translations + Next server/client |
| [`AGENTS.md`](../AGENTS.md) | App agent entry, commands |

## Repo-wide (may also need updates)

- [`.agents/rules/`](../../../.agents/rules/) — if behavior applies beyond this app (e.g. new security rule)
- Root [`AGENTS.md`](../../../AGENTS.md) — monorepo layout or shared commands
- [`.agents/skills/payload/`](../../../.agents/skills/payload/) — **vendored only**; run `bun run skills:update` from repo root when updating Payload guidance, do not hand-edit

## Quick verification

```bash
# From repo root — replace OLD with the renamed path/term
rg 'OLD' apps/payload-multi-tenant-template \
  apps/payload-multi-tenant-template/docs \
  apps/payload-multi-tenant-template/.agents \
  AGENTS.md .agents README.md
```
