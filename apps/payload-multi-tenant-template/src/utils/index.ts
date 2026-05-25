/**
 * Shared utilities that are not Payload `Access` functions.
 *
 * For authorization, use `@/access`. For generated document types, use `@/types`.
 */
export { getCollectionId } from './getCollectionId'
export { getTenantFromCookie } from './getTenantFromCookie'
export { getUserTenantIds } from './getUserTenantIds'
export { userBelongsToTenant } from './userBelongsToTenant'
export { userCanAccessActiveTenant } from './userCanAccessActiveTenant'
export type { SystemRole } from './systemRole'
export { userHasSystemRole, userIsSystemUser } from './systemRole'
export type { TenantRole } from './tenantRole'
export { userHasTenantRole } from './userHasTenantRole'
export { userIsSystemAdmin } from './userIsSystemAdmin'
export { userIsTenantAdmin } from './userIsTenantAdmin'
