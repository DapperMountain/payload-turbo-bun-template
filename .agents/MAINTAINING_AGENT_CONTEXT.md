# Maintaining agent and developer documentation

Hand-maintained docs must stay aligned with the codebase. **Agents:** treat doc sync as part of the task — do not wait for the user to ask. **Humans:** use the same checklist in PR review.

## When to update (triggers)

Update documentation when a change could mislead someone following existing docs or agent context:

| Category | Examples |
|----------|----------|
| **Paths & names** | Rename/move files or folders; change path aliases (`@config`, `@/access`); rename packages or compose services |
| **Config & env** | New/removed/renamed env vars; change validation library (e.g. Zod → something else); new `config/` layout |
| **Commands & tooling** | `package.json` scripts (`prepare`, hooks); Bun/Turbo/Docker workflow; app `bunfig.toml` / `.env.test` test setup |
| **Architecture** | New top-level `src/` area; barrel policy; access/collection layout; multi-tenant wiring |
| **Database** | Migration/seed workflow; test DB env; adapter or ORM references in docs |
| **i18n** | `src/lang` structure; `custom:*` translation keys; frontend `TranslationProvider` boundary |
| **Commits / hooks** | `docs/COMMITS.md`, `git-hooks.config.ts`, `scripts/validate-commit-msg.ts`, `.agents/rules/commits.mdc` |
| **Security** | Local API `overrideAccess`; hook `req` / transaction patterns (also update `security-critical.mdc` if rules change) |
| **Dependencies (documented stack)** | Replacing a library that docs name explicitly (Tamagui, Lexical, Postgres adapter, etc.) |

## When sync is usually not required

- Internal refactor with **unchanged** public paths, env names, scripts, and agent-facing behavior
- Comment-only or formatting-only edits
- User asked for a **docs-only** change (no code)
- Vendored [`.agents/skills/payload/`](skills/payload/) — update only via `bun run skills:update` from repo root, not hand-edits

## What to edit (by layer)

| Layer | Locations | Do not hand-edit |
|-------|-----------|------------------|
| **Monorepo rules** | [`.agents/rules/*.mdc`](rules/README.md), [`.agents/rules/README.md`](rules/README.md) | — |
| **Monorepo agent hub** | [`.agents/README.md`](README.md), root [`AGENTS.md`](../AGENTS.md) | `skills/payload/` (vendored) |
| **App — humans** | `apps/<app>/README.md`, `docs/CODE_CONVENTIONS.md`, `config/README.md`, feature READMEs | — |
| **App — agent overlay** | `apps/<app>/AGENTS.md`, `.agents/skills/dapper-payload-app/` (`SKILL.md` + `reference/*.md`) | — |
| **Env examples** | `.env.example`, `.env.test.example` — keep in sync with `TESTING.md` and parsers (see app checklist) | — |

For **`apps/payload-multi-tenant-template`**, use the detailed file map: [`docs/MAINTAINING_DOCS.md`](../apps/payload-multi-tenant-template/docs/MAINTAINING_DOCS.md).

## Before finishing (required for agents)

After code changes that match any **trigger** above:

1. **Search** hand-maintained docs for old paths, script names, env keys, and library names (`rg` / grep across `AGENTS.md`, `.agents/`, `docs/`, `*.md` in the affected app).
2. **Update** every listed doc that still references the old state (same PR / same session).
3. **Cross-check** env example files (e.g. `.env.test.example` ↔ `TESTING.md` / CI env vars).
4. **Do not** claim the task is complete if agent overlay or `CODE_CONVENTIONS` still describe the previous layout.

If the user said “code only” but the change is clearly documentation-critical, **still update docs** and note what you updated in the closing message.

## Humans (PR review)

- [ ] Triggers above considered?
- [ ] App `MAINTAINING_DOCS.md` checklist satisfied for touched app?
- [ ] No stale paths in `AGENTS.md`, skills, or `CODE_CONVENTIONS`?
- [ ] Vendored Payload skill untouched (or updated via `bun run skills:update` only)?
