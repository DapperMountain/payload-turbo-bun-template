import type { User } from '@/types'

const baseUser = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  collection: 'users' as const,
}

/** Platform administrator with full tenant visibility. */
export const systemAdminUser: User = {
  ...baseUser,
  id: 'admin-1',
  email: 'admin@example.com',
  roles: ['SYSTEM_ADMIN'],
  tenants: [],
}

/** Tenant member with `TENANT_USER` on one workspace. */
export const tenantMemberUser: User = {
  ...baseUser,
  roles: ['SYSTEM_USER'],
  tenants: [
    {
      tenant: 'tenant-a',
      roles: ['TENANT_USER'],
    },
  ],
}

/** Tenant admin for one workspace. */
export const tenantAdminUser: User = {
  ...baseUser,
  id: 'tenant-admin-1',
  email: 'tenant-admin@example.com',
  roles: ['SYSTEM_USER'],
  tenants: [
    {
      tenant: 'tenant-a',
      roles: ['TENANT_ADMIN'],
    },
  ],
}

/** Authenticated user with no tenant memberships. */
export const userWithoutTenants: User = {
  ...baseUser,
  id: 'user-no-tenant',
  email: 'no-tenant@example.com',
  roles: ['SYSTEM_USER'],
  tenants: [],
}
