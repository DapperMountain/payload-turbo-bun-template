# Agents (monorepo)

This repository is a **Bun + Turborepo** monorepo. Payload CMS guidance is shared at the root; app-specific overlays live under each app.

## Reading order

1. **Monorepo** (this file) — layout, Bun, Turborepo, Docker.
2. **Agent context** — [`.agents/`](.agents/) (rules + vendored skills).
3. **Workspace rules** — [`.agents/rules/`](.agents/rules/) (`bun`, `agent-workflow`, `clean`, `typescript`, `security-critical`).
4. **Payload skill** — [`.agents/skills/payload/`](.agents/skills/payload/) ([payloadcms/skills](https://github.com/payloadcms/skills)).
5. **App overlay** — when editing `apps/payload-multi-tenant-template`, read that app’s `AGENTS.md` and `.agents/skills/dapper-payload-app/`.

Tools that expect `.cursor/rules` or `.cursor/skills` use symlinks into `.agents/` (see [`.agents/README.md`](.agents/README.md)).

**Documentation sync:** After changes that affect paths, env, scripts, or documented tooling, update hand-maintained docs in the same session — see [`.agents/MAINTAINING_AGENT_CONTEXT.md`](.agents/MAINTAINING_AGENT_CONTEXT.md). Agents follow the mandatory checklist in [`agent-workflow.mdc`](.agents/rules/agent-workflow.mdc).

## Repository layout

```text
apps/
  payload-multi-tenant-template/   # Main Payload + Next template
packages/
  design-system/                   # Tamagui shared UI
  dependencies/                    # Pinned react + payload stacks
  typescript-config/
scripts/                           # Docker helpers (up.sh)
compose.yml
```

## Runtime and commands

- **Package manager**: Bun only (`packageManager` in root `package.json`). See `.agents/rules/bun.mdc`.
- **Install** (from repo root): `bun install`
- **Build app** (with deps): `bunx turbo build --filter=@dappermountain/payload-multi-tenant-template...`
- **Docker full stack**: `./scripts/up.sh` (app on host port **3001**)
- **Lint / format** (root): `bun run lint`, `bun run format`
- **Tests** (Payload app): from `apps/payload-multi-tenant-template`, `bun test` — see that app’s [`docs/TESTING.md`](apps/payload-multi-tenant-template/docs/TESTING.md)

## Payload skill (shared)

- Hub: [`.agents/skills/payload/SKILL.md`](.agents/skills/payload/SKILL.md)
- Reference: [`.agents/skills/payload/reference/`](.agents/skills/payload/reference/)
- **Update vendored copy** (from repo root):

```bash
bun run skills:update
```

Lockfile: [`skills-lock.json`](skills-lock.json).

## Apps

| App | Agent entry |
|-----|-------------|
| `apps/payload-multi-tenant-template` | [apps/payload-multi-tenant-template/AGENTS.md](apps/payload-multi-tenant-template/AGENTS.md) |
