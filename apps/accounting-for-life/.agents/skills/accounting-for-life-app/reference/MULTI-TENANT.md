# Multi-tenant plugin

Plugin source: [packages/plugin-multi-tenant](https://github.com/payloadcms/payload/tree/main/packages/plugin-multi-tenant)

## Do not use manual tenancy

**Do not** add a standalone `workspaceId` text field and filter on it. This app uses **`@payloadcms/plugin-multi-tenant`**.

## Configuration (`config/payload.ts`)

```typescript
multiTenantPlugin<Config>({
  collections: {
    budgets: {},
    'category-groups': {},
    categories: {},
  },
  tenantsSlug: 'workspaces',
  tenantField: { name: 'workspace' },
  tenantsArrayField: {
    includeDefaultField: false,
    arrayFieldName: 'workspaces',
    arrayTenantFieldName: 'workspace',
  },
  tenantSelectorLabel: 'Workspace',
  userHasAccessToAllTenants: (user) => userIsSystemAdmin(user),
})
```

- **Workspaces collection**: slug `workspaces` (household / workspace records)
- **Scoped FK field**: `workspace` on budgets, category groups, categories
- **User memberships**: `user.workspaces[]` with nested `workspace` + per-row roles
- **System admins**: `userHasAccessToAllTenants` uses `userIsSystemAdmin` from `@/utils`
- **Admin cookie**: still named `payload-tenant` (plugin default, not configurable)

## Users collection

- Import `tenantsArrayField` from `@payloadcms/plugin-multi-tenant/fields`
- Configure `tenantsArrayFieldName: 'workspaces'`, `tenantsArrayTenantFieldName: 'workspace'`, `tenantsCollectionSlug: 'workspaces'` on the spread `tenantsArrayField({ … })` in Users (plugin-level `arrayFieldName` / `arrayTenantFieldName` must match)
- Per-row **workspace roles** (`WORKSPACE_ADMIN`, `WORKSPACE_USER`); labels from `custom.roles` in `src/lang/`
- System-level roles on the user document: `SYSTEM_ADMIN`, `SYSTEM_USER`

## Roles (this app)

| Value | Meaning |
|-------|---------|
| `SYSTEM_ADMIN` | Cross-workspace admin |
| `SYSTEM_USER` | System user |
| `WORKSPACE_ADMIN` | Admin within assigned workspace(s) |
| `WORKSPACE_USER` | User within assigned workspace(s) |

Upstream examples using `admin` / `editor` / `user` do not match this template.

## Access layout

See `src/access/README.md`.

| Location | Purpose |
|----------|---------|
| `src/access/helpers/` | `withAuth`, `boolean`, `requireAll`, `requireOne`, … |
| `src/access/auth/`, `roles/`, `workspaces/` | Reusable `Access` functions |
| `src/access/collections/` | Per-collection maps (`users.ts`, `workspaces.ts`, `workspaceContent.ts`) |
| `src/utils/getUserWorkspaceIds.ts` | Resolve workspace IDs from `user.workspaces` |

| Check | File |
|-------|------|
| System admin (Access) | `src/access/roles/isSystemAdmin.ts` |
| System admin (util) | `@/utils` → `userIsSystemAdmin` |
| System staff (util) | `@/utils` → `userIsSystemUser`, `userHasSystemRole` |
| Admin or self / created-by | `@/access/roles` → `isAdminOrSelf`, `isCreatedBy` |
| Allow / deny all | `@/access/helpers` → `allowAll`, `denyAll` |
| Self-only | `src/access/roles/isSelf.ts` |
| Workspace document scope (`id`) | `src/access/workspaces/workspaceScope.ts` → `isWorkspace`, `isWorkspaceAdmin` |
| Workspace **content** scope (`workspace` field) | `src/access/workspaces/workspaceContentScope.ts` → `isWorkspaceContent*` |
| Starter content collection access | `src/access/collections/workspaceContent.ts` |
| Membership (util) | `@/utils` → `userHasWorkspaceRole`, `userBelongsToWorkspace`, `userIsWorkspaceAdmin` |
| Admin-selected workspace (util) | `@/utils` → `userCanAccessActiveWorkspace`, `getWorkspaceFromCookie` |
| Workspaces `read` policy | `requireOne(isSystemAdmin, isWorkspace)` in `src/access/collections/workspaces.ts` |

### Plugin access vs cookie vs template helpers

| Layer | What it uses | Effect |
|-------|----------------|--------|
| **`useTenantAccess: true`** (default) | All `user.workspaces` memberships | API access ANDs `{ workspace: { in: membershipIds } }` |
| **`payload-tenant` cookie** | Admin workspace selector | List views + relationship `filterOptions` (UX), not the default API boundary |
| **`workspaceContentAccess`** | Template role rules + optional plugin | Starter for new plugin-enabled collections |
| **`userCanAccessActiveWorkspace(req)`** | Cookie + membership | Hooks / custom endpoints when the selected workspace must match |

Workspace documents filter on `id: { in: … }`. Content collections filter on `workspace: { in: … }` via `isWorkspaceContent` or the plugin’s `getTenantAccess`.

Example content filter:

```typescript
const workspaceIds = getUserWorkspaceIds(user, 'WORKSPACE_ADMIN')
return workspaceIds.length ? { workspace: { in: workspaceIds } } : false
```

## Upstream reference

Generic patterns and examples:

- Root `.agents/skills/payload/reference/ACCESS-CONTROL.md` (multi-tenant section)
- Root `.agents/skills/payload/reference/ENDPOINTS.md` (e.g. multi-tenant login endpoint)

Those describe Payload-wide patterns; combine with this file for **this repo’s** field and role names.
