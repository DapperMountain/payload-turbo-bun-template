# Access control layout

```text
access/
├── helpers/          # Composable utilities (no collection-specific rules)
├── auth/             # Authentication primitives
├── roles/            # System-wide role checks
├── tenants/          # Tenant membership / tenant-admin scopes
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
| Tenant **workspace** scope (`id: { in: … }`) | `tenants/` (`tenantScope` on `tenants` collection) |
| Tenant **content** scope (`tenant: { in: … }`) | `tenants/` (`tenantContentScope`, `isTenantContent*`) |
| Which operations a **collection** allows | `collections/<slug>.ts` |

Collection configs import maps from `@/access/collections` (or `@/access/collections/<slug>` when only one map is needed).

## Utilities vs Access

| Use case | Import |
|----------|--------|
| Plugin callbacks, hooks, plain functions | `userIsSystemAdmin`, `userIsSystemUser`, `userHasTenantRole`, `userCanAccessActiveTenant` from `@/utils` |
| Collection / field / global `access` | `isSystemAdmin`, `isSystemUser`, `isTenant`, `isCreatedBy`, … from `@/access` or sub-barrels |

## Wiring a collection

```typescript
import { usersAccess } from '@/access/collections'

const Users: CollectionConfig = {
  slug: 'users',
  access: usersAccess,
}
```

## Tenants collection read policy

`tenantsAccess.read` uses `requireOne(isSystemAdmin, isTenant)` so members can read their workspace rows, not only system admins. See the module comment in `collections/tenants.ts`.

## Tenant-owned collections

Register slugs in `multiTenantPlugin({ collections: { pages: {} } })`, then assign access — starter map:

```typescript
import { tenantContentAccess } from '@/access/collections'

const Pages: CollectionConfig = {
  slug: 'pages',
  access: tenantContentAccess,
}
```

With default `useTenantAccess: true`, the plugin also ANDs membership on the `tenant` field. See `collections/tenantContent.ts` and `reference/MULTI-TENANT.md`.

## Tests

Spec files mirror folder responsibility — not one spec per source file.

| Folder | Spec file | Naming rule |
|--------|-----------|-------------|
| `helpers/` | `helpers.spec.ts` | `<folder>.spec.ts` — all composable helpers in one file |
| `auth/` | `auth.spec.ts` | `<folder>.spec.ts` |
| `roles/` | `roles.spec.ts` | `<folder>.spec.ts` — all role/ownership `Access` exports |
| `tenants/` | `tenants.spec.ts` | `<folder>.spec.ts` — workspace + content scope factories |
| `collections/` | `<slug>.access.spec.ts` | Matches policy source (`tenants.ts` → `tenants.access.spec.ts`) |
| `test/` | *(none)* | Fixtures only (`accessArgs`, test users) — not production access |

**Do not add** `isTenant.spec.ts`, `requireOne.spec.ts`, etc. beside each module; extend the folder spec or the collection policy spec instead.

**When to add a new spec**

- New helper → `helpers.spec.ts` `describe` block
- New role export → `roles.spec.ts`
- New tenant scope preset → `tenants.spec.ts`
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
| `isSystemAdmin` | `userIsSystemAdmin` | Cross-tenant administrators only |
| `isAdminOrSelf` | — | Admins see all rows; others only `id === req.user.id` (alternative `users` map) |
| `isCreatedBy` / `isCreatedByScope(field)` | — | Author-owned documents (`createdBy` field) |
| `allowAll` / `denyAll` | — | Explicit public or locked operations |

## Imperative tenant checks (hooks / endpoints)

| Util | Use |
|------|-----|
| `userHasTenantRole(user, tenantId, role?)` | General membership + optional role |
| `userBelongsToTenant(user, tenantId)` | Member of workspace (any role) |
| `userIsTenantAdmin(user, tenantId?)` | `TENANT_ADMIN` on one or any tenant |
| `userCanAccessActiveTenant(req, role?)` | `payload-tenant` cookie + membership |
| `getTenantFromCookie(headers, idType)` | Read selected tenant id from cookie |
