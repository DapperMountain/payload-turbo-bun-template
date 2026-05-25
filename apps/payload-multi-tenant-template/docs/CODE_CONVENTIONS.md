# Code conventions

Project-specific layout and documentation standards for `payload-multi-tenant-template`. Payload’s default templates often use flat files (e.g. `collections/Posts.ts`); this app uses **feature folders** and **barrel `index` files** for clearer boundaries and stable import paths.

## Source layout

```text
src/
├── access/                 # Authorization (see access/README.md)
├── app/                    # Next.js App Router
├── collections/            # Payload collections (folder per collection)
├── database/
│   ├── migrations/
│   └── seed/
├── endpoints/              # Custom Payload endpoints
├── lang/                   # Translation source (en/es), types, Payload i18n wiring
├── test/                   # Integration harness (`preload.ts`, `config.ts`)
├── types.ts                # Generated Payload types (do not edit)
└── utils/                  # Shared helpers (`i18n.client.ts`, `i18n.server.ts`, …)
config/
├── README.md               # Env var reference (start here)
├── index.ts                # Public facade (@config)
├── payload.ts              # buildConfig (@payload-config)
├── app/                    # Zod env config + parsers/
└── adapters/               # AppConfig → Payload/pg (config/ only)
```

## Collections (folder-per-collection)

Each collection is a directory named in **PascalCase** matching the export:

```text
collections/
├── index.ts                # Registers all collections + named exports
├── Users/
│   ├── index.ts            # CollectionConfig (default export)
│   └── hooks/
│       ├── index.ts        # Barrel: `hooks`, `fieldHooks`
│       ├── collection/
│       │   └── index.ts    # `hooks` — CollectionConfig['hooks']
│       └── fields/
│           ├── index.ts    # per-field `fieldHooks` (`Field['hooks']`) for that field’s config
│           └── *.ts        # Field hook implementations
└── Tenants/
    ├── index.ts
    └── hooks/
        └── index.ts
```

**Rules:**

- **`collections/<Name>/index.ts`** — single `CollectionConfig`, default export.
- **Subfolders** (`hooks/`, future `fields/`, etc.) each have an **`index.ts`** that composes the shape Payload expects.
- **Access maps** live in `src/access/collections/<slug>.ts`, not under `collections/`, so permissions stay auditable in one tree.
- **Register** new collections in `collections/index.ts` and export a named symbol when other modules need the slug (e.g. `Users` in `config/payload.ts`).

**Import examples:**

```typescript
import collections, { Users } from '@/collections'
import { fieldHooks, hooks } from './hooks' // inside collections/Users/index.ts only

// Field: import `fieldHooks` from `./hooks/fields` (or re-exported `./hooks`)
{ name: 'fullName', type: 'text', hooks: fieldHooks }
```

## Barrel exports (`index.ts`)

Use an `index.ts` at the **public boundary** of a folder when the folder has multiple modules or is imported from outside.

| Folder | Barrel exports |
|--------|----------------|
| `collections/` | `default` array + `{ Users, Tenants }` |
| `collections/Users/hooks/` | `hooks`, `fieldHooks` |
| `access/` | Public access API (see `access/index.ts`) |
| `access/helpers/`, `auth/`, `roles/`, `tenants/`, `collections/` | Sub-barrels re-exported from `@/access` |
| `utils/` | Shared utilities |
| `lang/` | `i18n`, `localization`, `custom` (English source); `types.ts` for `CustomTranslationKeys` |
| `utils/i18n.client.ts`, `utils/i18n.server.ts` | `useAppTranslation`, `getRequestI18n` (not in `@/utils` barrel) |
| `endpoints/` | `default` array |
| `endpoints/health/` | `default` endpoint |
| `database/seed/` | `seed()` |
| `database/seed/users/` | `seedUsers` |
| `test/` | `payload`, test helpers (integration tests only) |

**Import rules:**

1. **From outside a feature**, import via the folder barrel: `@/utils`, `@/access/roles`, `@/collections`.
2. **Inside the same feature**, use relative imports (`./hooks`, `../helpers`) to avoid circular dependencies.
3. **Do not** import the root `@/access` barrel from files under `src/access/**` (use sub-barrels or relatives).
4. **Omit** `.ts` / `.tsx` extensions in TypeScript imports.
5. **Do not** barrel-export generated `types.ts` — import types from `@/types`.

### When not to use barrels

Barrels mark a **stable public boundary**. Skip `index.ts` when a barrel would add ceremony without benefit:

| Skip barrels for… | Instead |
|-------------------|---------|
| Generated output (`types.ts`) | `import type { User } from '@/types'` |
| Same feature / sibling files | Relative paths (`./hooks`, `./tenantScope`) |
| Single-file folder unlikely to grow | Keep one module (e.g. `formatDate.ts`) until a second file appears |
| Private implementation (one consumer, unstable) | Import the concrete file; do not re-export from a parent barrel |
| Internal subfolder with tests only (e.g. `config/app/parsers/`) | Co-locate `*.spec.ts`; **no** `index.ts` unless another package imports the folder |
| Modules with import-time side effects | Import only where that side effect is intended |
| Graphs that would cycle | Sub-barrels or direct file imports (see `access/`) |

Prefer a **narrow** barrel (`@/access/collections`) over the widest one (`@/access`) when you only need part of the feature.

### Quick rule of thumb

| Situation | Convention |
|-----------|----------------|
| Another feature imports it | Barrel at folder root (`index.ts`) |
| Same folder or sibling | Relative path |
| Generated, one-off, or private | No barrel |
| Risk of cycles or load side effects | No barrel (or a smaller sub-barrel) |

## Path aliases

| Alias | Target |
|-------|--------|
| `@/*` | `src/*` |
| `@config` | `config/index.ts` |
| `@payload-config` | `config/payload.ts` |
| `@collections/*` | `src/collections/*` (optional; prefer `@/collections`) |

## Frontend / design system

Public pages under `src/app/(frontend)/` use **`@dappermountain/design-system`** only — not `tamagui` (enforced by ESLint).

Route segment layout:

```text
(frontend)/
├── layout.tsx, page.tsx    # Server components only
├── globals.css
├── actions/                # Server Actions for this segment
└── _components/            # Colocated client UI (Next.js private folder)
```

| Rule | Detail |
|------|--------|
| UI imports | `@dappermountain/design-system` (`Stack`, `Button`, `DesignSystemProvider`, …) |
| New primitives | Add in `packages/design-system`, then import from the package in this app |
| i18n | Copy in `src/lang`; runtime: `useAppTranslation` / `getRequestI18n`; keys `custom:*` |

Full guide: **[`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)**.

## Code style

Repo-wide readability rules (early returns, guard clauses, shallow nesting) live in **[`.agents/rules/clean.mdc`](../../../.agents/rules/clean.mdc)**. Apply them in `src/`, `config/`, and hooks alongside this file’s layout and TSDoc rules.

Summary:

- Fail fast: validate inputs and permissions at the top of a function.
- Prefer early `return` / `throw` over `else` after an exiting branch.
- Keep nesting shallow; extract a well-named helper when conditionals stack up.

| Topic | Doc |
|-------|-----|
| Types, strictness | [`.agents/rules/typescript.mdc`](../../../.agents/rules/typescript.mdc) |
| Readability, early returns | [`.agents/rules/clean.mdc`](../../../.agents/rules/clean.mdc) |
| Agent edit behavior | [`.agents/rules/agent-workflow.mdc`](../../../.agents/rules/agent-workflow.mdc) |
| Rule index | [`.agents/rules/README.md`](../../../.agents/rules/README.md) |

## Documentation comments

This project follows **[TSDoc](https://tsdoc.org/)** — TypeScript’s standard for documentation comments. TSDoc is a structured profile of JSDoc: IDEs, `tsc`, and doc generators understand it; it is the practical choice for TS codebases (not separate from JSDoc, but stricter and TS-aware).

### When to document

| Document | Skip |
|----------|------|
| Exported functions, types, constants | Obvious one-liners (`const x = 1`) |
| `index.ts` module purpose (one block at top) | Every line of boilerplate |
| Non-obvious business rules (access, seed, i18n) | Restating the type system |
| `@param` / `@returns` on public APIs | Implementation details already clear from names |
| Exported test helpers (e.g. `src/access/test/`) | `describe` / `it` in `*.spec.ts` |
| File-level notes on integration harness (`src/test/config.ts`) when non-obvious | Restating `describe` / `it` titles |

### Tests

Unit and integration specs use **plain-English `describe` and `it` names** as the spec text. Do **not** add TSDoc blocks on individual tests — that duplicates the title and drifts when tests are renamed.

Document **shared test utilities** (fixtures, `accessArgs`, factories) the same as production exports. Example: [`src/access/test/accessArgs.ts`](../src/access/test/accessArgs.ts).

Use a short `//` comment only when the test name cannot carry the intent (policy id, ordering caveat, harness quirk). Prefer fixing the test name over commenting.

| Layer | Location | Command |
|-------|----------|---------|
| Unit — access | `src/access/**/*.spec.ts` | `bun test ./src/access` |
| Unit — config | `config/app/**/*.spec.ts` | `bun test ./config/app` |
| Unit — utils | `src/utils/*.spec.ts` | `bun test` (or full suite) |
| Integration — collections | `src/collections/<Name>/*.integration.spec.ts` | `bun test ./src/collections` |

Testing guide: [TESTING.md](./TESTING.md). Access unit details: [`src/access/README.md`](../src/access/README.md).

### Syntax

- Use **`/** ... */`** only (not `//` for public API docs).
- **One summary sentence** first; optional detail after a blank line.
- **`@param name - Description`** (TSDoc hyphen form).
- **`@returns Description`** for non-void functions.
- **`@see {@link URL}`** for external docs (Payload, etc.).
- **`@packageDocumentation`** on feature `index.ts` barrels when the whole folder is one unit (optional).
- Prefer **`@link`** to local symbols only when it helps navigation; avoid broken links.

### What we do not use

- JSDoc-only tags that TypeScript ignores unless you run a separate tool (`@author`, `@since` unless required).
- Block comments inside JSX for “documentation.”
- Comments that duplicate the function name (`/** Gets the user */` on `getUser`).

### Example

```typescript
/**
 * Row-level access to tenant documents the user belongs to.
 *
 * System administrators bypass via {@link withAuth}. Returns a `Where` filter
 * or `false` when the user has no tenant memberships.
 */
export const isTenant = tenantScope()
```

## Related docs

- [`.agents/rules/README.md`](../../../.agents/rules/README.md) — workspace rule index
- [`src/access/README.md`](../src/access/README.md) — access control layout
- [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — frontend UI package and imports
- [`AGENTS.md`](../AGENTS.md) — AI agent entry point
- [`MAINTAINING_DOCS.md`](MAINTAINING_DOCS.md) — when to update docs after code changes (paths, env, tooling, etc.)
