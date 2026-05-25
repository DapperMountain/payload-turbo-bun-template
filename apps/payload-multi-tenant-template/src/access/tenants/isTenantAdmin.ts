import { tenantScope } from './tenantScope'

/**
 * Row-level scope for tenants where the user has the `TENANT_ADMIN` role.
 *
 * @see {@link tenantScope}
 */
export const isTenantAdmin = tenantScope('TENANT_ADMIN')
