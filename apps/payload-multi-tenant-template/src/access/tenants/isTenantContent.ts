import { tenantContentScope } from './tenantContentScope'

/** Read scope for tenant-owned content (any tenant role). */
export const isTenantContent = tenantContentScope()

/** Row scope where the user has `TENANT_ADMIN` on the document's tenant. */
export const isTenantContentAdmin = tenantContentScope('TENANT_ADMIN')

/** Row scope where the user has `TENANT_USER` on the document's tenant. */
export const isTenantContentUser = tenantContentScope('TENANT_USER')
