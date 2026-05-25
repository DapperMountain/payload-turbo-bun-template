import { tenantScope } from './tenantScope'

/**
 * Read/update scope for any tenant the user belongs to (any tenant role).
 *
 * @see {@link tenantScope}
 */
export const isTenant = tenantScope()
