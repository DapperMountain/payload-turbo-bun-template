# Workspace rules (monorepo)

Canonical rules for AI coding agents (`.mdc`). **Edit files in this directory** — `.cursor/rules` is a symlink here.

## Rule index

| File | `alwaysApply` | Scope | Owns |
|------|---------------|--------|------|
| `bun.mdc` | yes | Whole repo | Bun-only install, scripts, runtime |
| `agent-workflow.mdc` | yes | Whole repo | How the agent edits and communicates; **doc sync before task complete** |
| `commits.mdc` | yes | Whole repo | Devmoji + Conventional Commits when creating git commits |
| `clean.mdc` | no | When relevant | Code readability: naming, DRY, control flow, early returns |
| `typescript.mdc` | no | `**/*.{ts,tsx,d.ts}` | Types, strictness, guards — not barrels or style |
| `security-critical.mdc` | no | `apps/**/*` | Payload Local API, hooks, transactions |

## App-specific conventions

| Topic | Location |
|-------|----------|
| Folder layout, barrels, TSDoc, tests | `apps/payload-multi-tenant-template/docs/CODE_CONVENTIONS.md` |
| Env / Zod config | `apps/payload-multi-tenant-template/config/README.md` |
| Payload overlay | `apps/payload-multi-tenant-template/.agents/skills/dapper-payload-app/` |

## Payload reference

Vendored skill: [`.agents/skills/payload/`](../skills/payload/) — update with `bun run skills:update` from repo root.

## Keeping docs in sync

- Policy: [`.agents/MAINTAINING_AGENT_CONTEXT.md`](../MAINTAINING_AGENT_CONTEXT.md)
- App checklist: `apps/payload-multi-tenant-template/docs/MAINTAINING_DOCS.md`
- Enforced in `agent-workflow.mdc` (always applied)

## Avoid duplicating guidance

- Do **not** put code-style rules in `agent-workflow.mdc` — use `clean.mdc`.
- Do **not** put barrel/layout rules in `typescript.mdc` — use app `CODE_CONVENTIONS.md`.
- Do **not** merge `security-critical.mdc` into the Payload skill — the rule is the short must-follow checklist; the skill is the full reference.
