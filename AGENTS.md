# Agents (monorepo)

This repository is a **Bun + Turborepo** monorepo. Payload CMS guidance is shared at the root; app-specific overlays live under each app.

## Reading order

1. **Monorepo** (this file) — layout, Bun, Turborepo, Docker.
2. **Agent context** — [`.agents/`](.agents/) (rules + vendored skills).
3. **Workspace rules** — [`.agents/rules/`](.agents/rules/) (`bun`, `agent-workflow`, `commits`, `clean`, `typescript`, `security-critical`).
4. **Payload skill** — [`.agents/skills/payload/`](.agents/skills/payload/) ([payloadcms/skills](https://github.com/payloadcms/skills)).
5. **App overlay** — when editing `apps/accounting-for-life`, read that app’s `AGENTS.md` and `.agents/skills/accounting-for-life-app/`.

Tools that expect `.cursor/rules` or `.cursor/skills` use symlinks into `.agents/` (see [`.agents/README.md`](.agents/README.md)).

**Documentation sync:** After changes that affect paths, env, scripts, or documented tooling, update hand-maintained docs in the same session — see [`.agents/MAINTAINING_AGENT_CONTEXT.md`](.agents/MAINTAINING_AGENT_CONTEXT.md). Agents follow the mandatory checklist in [`agent-workflow.mdc`](.agents/rules/agent-workflow.mdc).

## Repository layout

```text
apps/
  accounting-for-life/   # Main Payload CMS app (@payloadcms/next)
  mobile/              # Expo + Uniwind (native spike)
packages/
  ui/                              # @dappermountain/ui — Tailwind v4, shadcn, shared tokens
  typescript-config/               # Shared tsconfig fragments
docs/COMMITS.md                    # Devmoji + Conventional Commits
scripts/                           # up.sh, validate-commit-msg.ts
git-hooks.config.ts                # bun-git-hooks
compose.yml
```

The app declares **Payload** (`payload`, `@payloadcms/*`) and **`@dappermountain/ui`** in its own `package.json`. **Next/React** are hoisted from the root workspace for **`@payloadcms/next`**. Dev: `bun dev` (Payload). CLI: `bun run payload`.

## Runtime and commands

- **Package manager**: Bun only (`packageManager` in root `package.json`). See `.agents/rules/bun.mdc`.
- **Install** (from repo root): `bun install` (also installs commit-msg hooks via `bun-git-hooks` — see `git-hooks.config.ts`)
- **Build app** (with deps): `bunx turbo build --filter=@dappermountain/accounting-for-life...` from repo root — Turbo cascades `^build`; per-package `bun run build` is only for isolated/atomic work
- **Docker full stack**: `./scripts/up.sh` (app on host port **3001**)
- **Lint / format** (root): `bun run lint`, `bun run format`
- **Tests** (Payload app): from `apps/accounting-for-life`, `bun test` — see that app’s [`docs/TESTING.md`](apps/accounting-for-life/docs/TESTING.md)
- **Commits:** [Devmoji](https://github.com/folke/devmoji) + Conventional Commits — [`docs/COMMITS.md`](docs/COMMITS.md); agents: [`.agents/rules/commits.mdc`](.agents/rules/commits.mdc); hooks install on `bun install` via `bun-git-hooks` — no AI `Co-authored-by:` trailers

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
| `apps/accounting-for-life` | [apps/accounting-for-life/AGENTS.md](apps/accounting-for-life/AGENTS.md) |
| `apps/mobile` | Expo + Uniwind spike — see [apps/mobile/README.md](apps/mobile/README.md) |
