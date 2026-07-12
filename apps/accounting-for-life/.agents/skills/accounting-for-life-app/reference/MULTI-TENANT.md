# Multi-tenant plugin

Plugin source: [packages/plugin-multi-tenant](https://github.com/payloadcms/payload/tree/main/packages/plugin-multi-tenant)

## Do not use manual tenancy

**Do not** add a standalone `tenantId` text field and filter on it. This app uses **`@payloadcms/plugin-multi-tenant`**.

## Configuration (`config/payload.ts`)

```typescript
multiTenantPlugin<Config>({
  collections: {},
  tenantsSlug: 'tenants',
  tenantsArrayField: { includeDefaultField: false },
  userHasAccessToAllTenants: (user) => userIsSystemAdmin(user),
})
```

- **Tenants collection**: slug `tenants`
- **System admins**: `userHasAccessToAllTenants` uses `userIsSystemAdmin` from `@/utils`

## Users collection

- Import `tenantsArrayField` from `@payloadcms/plugin-multi-tenant/fields`
- Spread into Users fields with per-row **tenant roles** (`TENANT_ADMIN`, `TENANT_USER`)
- System-level roles on the user document: `SYSTEM_ADMIN`, `SYSTEM_USER` (labels from `custom.roles` in `src/lang/en.ts` / `@/lang`)

## Roles (this app)

| Value | Meaning |
|-------|---------|
| `SYSTEM_ADMIN` | Cross-tenant admin |
| `SYSTEM_USER` | System user |
| `TENANT_ADMIN` | Admin within assigned tenant(s) |
| `TENANT_USER` | User within assigned tenant(s) |

Upstream examples using `admin` / `editor` / `user` do not match this template.

## Access layout

See `src/access/README.md`.

| Location | Purpose |
|----------|---------|
| `src/access/helpers/` | `withAuth`, `boolean`, `requireAll`, `requireOne`, … |
| `src/access/auth/`, `roles/`, `tenants/` | Reusable `Access` functions |
| `src/access/collections/` | Per-collection maps (`users.ts`, `tenants.ts`, `tenantContent.ts`) |
| `src/utils/getUserTenantIds.ts` | Resolve tenant IDs from `user.tenants` |

| Check | File |
|-------|------|
| System admin (Access) | `src/access/roles/isSystemAdmin.ts` |
| System admin (util) | `@/utils` → `userIsSystemAdmin` |
| System staff (util) | `@/utils` → `userIsSystemUser`, `userHasSystemRole` |
| Admin or self / created-by | `@/access/roles` → `isAdminOrSelf`, `isCreatedBy` |
| Allow / deny all | `@/access/helpers` → `allowAll`, `denyAll` |
| Self-only | `src/access/roles/isSelf.ts` |
| Tenant **workspace** scope (`id`) | `src/access/tenants/tenantScope.ts` → `isTenant`, `isTenantAdmin` |
| Tenant **content** scope (`tenant` field) | `src/access/tenants/tenantContentScope.ts` → `isTenantContent*` |
| Starter content collection access | `src/access/collections/tenantContent.ts` |
| Membership (util) | `@/utils` → `userHasTenantRole`, `userBelongsToTenant`, `userIsTenantAdmin` |
| Admin-selected tenant (util) | `@/utils` → `userCanAccessActiveTenant`, `getTenantFromCookie` |
| Tenants `read` policy | `requireOne(isSystemAdmin, isTenant)` in `src/access/collections/tenants.ts` |

### Plugin access vs cookie vs template helpers

| Layer | What it uses | Effect |
|-------|----------------|--------|
| **`useTenantAccess: true`** (default) | All `user.tenants` memberships | API access ANDs `{ tenant: { in: membershipIds } }` |
| **`payload-tenant` cookie** | Admin tenant selector | List views + relationship `filterOptions` (UX), not the default API boundary |
| **`tenantContentAccess`** | Template role rules + optional plugin | Starter for new plugin-enabled collections |
| **`userCanAccessActiveTenant(req)`** | Cookie + membership | Hooks / custom endpoints when the selected tenant must match |

Workspace (`tenants` collection) filters use `id: { in: … }`. Content collections use `tenant: { in: … }` via `isTenantContent` or the plugin’s `getTenantAccess`.

Example content filter:

```typescript
const tenantIds = getUserTenantIds(user, 'TENANT_ADMIN')
return tenantIds.length ? { tenant: { in: tenantIds } } : false
```

## Upstream reference

Generic patterns and examples:

- Root `.agents/skills/payload/reference/ACCESS-CONTROL.md` (multi-tenant section)
- Root `.agents/skills/payload/reference/ENDPOINTS.md` (e.g. multi-tenant login endpoint)

Those describe Payload-wide patterns; combine with this file for **this repo’s** field and role names.
