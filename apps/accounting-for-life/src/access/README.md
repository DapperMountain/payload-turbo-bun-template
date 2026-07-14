# Access control layout

```text
access/
├── helpers/          # Composable utilities (no collection-specific rules)
├── auth/             # Authentication primitives
├── roles/            # System-wide role checks
├── workspaces/       # Workspace membership / workspace-admin scopes
├── budgets/          # Budget membership scopes (`BUDGET_ADMIN` / `_MEMBER` / `_READONLY`)
├── collections/      # Collection `access` maps (create/read/update/delete)
└── index.ts          # Public exports
```

## Where to put new code

| You are adding… | Location |
|-----------------|----------|
| `withX`, `requireAll`, `requireOne`, boolean coercion | `helpers/` |
| “Is user logged in?” | `auth/` |
| System roles (`SYSTEM_ADMIN`, `SYSTEM_USER`, self, admin or self) | `roles/` |
| Allow / deny all | `helpers/allowAll`, `helpers/denyAll` |
| Workspace document scope (`id: { in: … }`) | `workspaces/` (`workspaceScope` on `workspaces` collection) |
| Workspace **content** scope (`workspace: { in: … }`) | `workspaces/` (`workspaceContentScope`, `isWorkspaceContent*`) |
| Budget membership scope (`budget: { in: … }` / budget `id`) | `budgets/` (`budgetContentScope`, `isBudgetContent*`) |
| Which operations a **collection** allows | `collections/<slug>.ts` |

Collection configs import maps from `@/access/collections` (or `@/access/collections/<slug>` when only one map is needed).

## Utilities vs Access

| Use case | Import |
|----------|--------|
| Plugin callbacks, hooks, plain functions | `userIsSystemAdmin`, `userIsSystemUser`, `userHasWorkspaceRole`, `userCanAccessActiveWorkspace` from `@/utils` |
| Collection / field / global `access` | `isSystemAdmin`, `isSystemUser`, `isWorkspace`, `isCreatedBy`, … from `@/access` or sub-barrels |

## Wiring a collection

```typescript
import { usersAccess } from '@/access/collections'

const Users: CollectionConfig = {
  slug: 'users',
  access: usersAccess,
}
```

## Workspaces collection read policy

`workspacesAccess.read` uses `requireOne(isSystemAdmin, isWorkspace)` so members can read their workspace rows, not only system admins. See the module comment in `collections/workspaces.ts`.

## Workspace-owned collections

Register slugs in `multiTenantPlugin({ collections: { pages: {} } })`, then assign access — starter map:

```typescript
import { workspaceContentAccess } from '@/access/collections'

const Pages: CollectionConfig = {
  slug: 'pages',
  access: workspaceContentAccess,
}
```

With default `useTenantAccess: true`, the plugin also ANDs membership on the `workspace` field. See `collections/workspaceContent.ts` and `reference/MULTI-TENANT.md`.

## Tests

Spec files mirror folder responsibility — not one spec per source file.

| Folder | Spec file | Naming rule |
|--------|-----------|-------------|
| `helpers/` | `helpers.spec.ts` | `<folder>.spec.ts` — all composable helpers in one file |
| `auth/` | `auth.spec.ts` | `<folder>.spec.ts` |
| `roles/` | `roles.spec.ts` | `<folder>.spec.ts` — all role/ownership `Access` exports |
| `workspaces/` | `workspaces.spec.ts` | `<folder>.spec.ts` — workspace + content scope factories |
| `collections/` | `<slug>.access.spec.ts` | Matches policy source (`workspaces.ts` → `workspaces.access.spec.ts`) |
| `test/` | *(none)* | Fixtures only (`accessArgs`, test users) — not production access |

**Do not add** `isTenant.spec.ts`, `requireOne.spec.ts`, etc. beside each module; extend the folder spec or the collection policy spec instead.

**When to add a new spec**

- New helper → `helpers.spec.ts` `describe` block
- New role export → `roles.spec.ts`
- New workspace scope preset → `workspaces.spec.ts`
- New collection policy file → `collections/<slug>.access.spec.ts`

**Collection spec layout** — mirror `usersAccess` keys:

```text
describe('<slug>Access')
  describe('read')     // const read = map.read!
  describe('create')   // it.each for repeated admin-only rules
```

Use `expectAccess` from `@/access/test` for async access checks. One behavior per `it`; use `it.each` when the same rule applies to several personas.

Run: `bun test ./src/access` from the app directory (see `docs/TESTING.md`).

## System roles and ownership

| Access | Util | Use |
|--------|------|-----|
| `isSystemUser` | `userIsSystemUser` | Platform staff (`SYSTEM_ADMIN` or `SYSTEM_USER`) |
| `isSystemAdmin` | `userIsSystemAdmin` | Cross-workspace administrators only |
| `isAdminOrSelf` | — | Admins see all rows; others only `id === req.user.id` (alternative `users` map) |
| `isCreatedBy` / `isCreatedByScope(field)` | — | Author-owned documents (`createdBy` field) |
| `allowAll` / `denyAll` | — | Explicit public or locked operations |

## Imperative workspace checks (hooks / endpoints)

| Util | Use |
|------|-----|
| `userHasWorkspaceRole(user, workspaceId, role?)` | General membership + optional role |
| `userBelongsToWorkspace(user, workspaceId)` | Member of workspace (any role) |
| `userIsWorkspaceAdmin(user, workspaceId?)` | `WORKSPACE_ADMIN` on one or any workspace |
| `userCanAccessActiveWorkspace(req, role?)` | `payload-tenant` cookie + membership |
| `getWorkspaceFromCookie(headers, idType)` | Read selected workspace id from cookie |

## Budget membership (US-1.2 / US-1.3)

| Util / access | Use |
|---------------|-----|
| `user.budgets[]` on Users | `{ budget, roles: BUDGET_ADMIN \| BUDGET_MEMBER \| BUDGET_READONLY }` |
| `getUserBudgetIds` / `getUserWritableBudgetIds` | Membership lists for scopes |
| `userHasBudgetRole` / `userBelongsToBudget` / `userIsBudgetAdmin` | Imperative checks |
| `addUserBudgetMembership` | Idempotent grant (create hook + seeds) |
| `canCreateOnBudget` / `canUpdateOnBudget` | Create/update against body `budget` (US-1.3; create must be boolean, not `Where`) |
| `budgetContentAccess` | Read = membership `Where`; create/update = body `budget` checks |
| `budgetsAccess` | Document scope by membership; create = workspace admin; delete = trash for budget admin, permanent for system admin |
| `payload-budget` cookie | Frontend active-budget UI only — not access or hooks |
