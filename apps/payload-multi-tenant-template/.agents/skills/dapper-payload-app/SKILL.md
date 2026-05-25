---
name: dapper-payload-app
description: >-
  Payload multi-tenant template app (apps/payload-multi-tenant-template). Use with
  root payload skill. Covers config/payload.ts, Zod @config, Postgres, seeding,
  plugin-multi-tenant, and src/lang — not Payload core monorepo dev.
---

# Dapper Payload multi-tenant app

Read this skill **before** generic guidance in the root [payload skill](../../../../../.agents/skills/payload/SKILL.md).
Upstream examples often assume `pnpm`, `payload-types.ts`, and MongoDB.

## Reading order

1. This skill — pick a reference doc below.
2. Root [payload/SKILL.md](../../../../../.agents/skills/payload/SKILL.md).
3. Monorepo: root [AGENTS.md](../../../../../AGENTS.md) (Bun, Turborepo, Docker).
4. Root workspace rules — [`.agents/rules/README.md`](../../../../../.agents/rules/README.md).

## Reference docs

| Topic | File |
|-------|------|
| Layout, config, types, plugins, validation | [reference/PROJECT.md](reference/PROJECT.md) |
| Frontend design system (`@dappermountain/design-system`) | [`docs/DESIGN_SYSTEM.md`](../../../docs/DESIGN_SYSTEM.md) |
| Postgres, migrations, seeding | [reference/DATABASE.md](reference/DATABASE.md) |
| Tests (`bun test`, `.env.test`, `bunfig.toml`) | [`docs/TESTING.md`](../../../docs/TESTING.md) |
| Multi-tenant plugin and access | [reference/MULTI-TENANT.md](reference/MULTI-TENANT.md) |
| App translations (`src/lang`) | [reference/I18N.md](reference/I18N.md) |

## Upstream Payload skill

- Hub: `/.agents/skills/payload/SKILL.md` (repo root)
- Update: `bun run skills:update` from **repository root**

## Plugin source

[plugin-multi-tenant](https://github.com/payloadcms/payload/tree/main/packages/plugin-multi-tenant)

## Keeping docs in sync

After code changes that affect paths, env, scripts, validation (e.g. replacing Zod), DB/test workflow, or i18n layout:

1. Run the checklist in [`docs/MAINTAINING_DOCS.md`](../../../docs/MAINTAINING_DOCS.md).
2. Update this skill’s `reference/*.md` when those topics change.
3. Do not hand-edit vendored `/.agents/skills/payload/` — use `bun run skills:update` from repo root.

Monorepo policy: [`.agents/MAINTAINING_AGENT_CONTEXT.md`](../../../../../.agents/MAINTAINING_AGENT_CONTEXT.md).
