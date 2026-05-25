# Agent context (monorepo)

Canonical location for AI agent skills and workspace rules.

```text
.agents/
├── rules/          # Workspace rules (*.mdc) — edit here
└── skills/
    └── payload/    # Vendored from payloadcms/skills — use `bun run skills:update`
```

Per-app overlays live under `apps/<name>/.agents/skills/` (e.g. `dapper-payload-app`).

| Path | Managed by | Edit? |
|------|------------|-------|
| `skills/payload/` | `bun run skills:update` ([payloadcms/skills](https://github.com/payloadcms/skills)) | No — vendored |
| `rules/*.mdc` | Hand-maintained — see [`rules/README.md`](rules/README.md) | Yes |
| `apps/*/.../dapper-payload-app/` | Hand-maintained per app | Yes |

Lockfile: [`skills-lock.json`](../skills-lock.json) at repository root.

**Editor compatibility:** `.cursor/rules` and `.cursor/skills` symlink into this tree where needed.

## Keeping context in sync

When code changes affect paths, env, scripts, tooling, or anything agents/developers rely on in docs, **update hand-maintained documentation in the same change** — do not wait to be asked.

- **Policy & triggers:** [MAINTAINING_AGENT_CONTEXT.md](MAINTAINING_AGENT_CONTEXT.md)
- **App file map:** [`apps/payload-multi-tenant-template/docs/MAINTAINING_DOCS.md`](../apps/payload-multi-tenant-template/docs/MAINTAINING_DOCS.md)
- **Enforced for agents:** [`rules/agent-workflow.mdc`](rules/agent-workflow.mdc) — “Documentation sync” section (`alwaysApply: true`)
