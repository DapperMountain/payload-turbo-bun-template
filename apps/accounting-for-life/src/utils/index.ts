/**
 * Shared utilities that are not Payload `Access` functions.
 *
 * For authorization, use `@/access`. For generated document types, use `@/types`.
 */
export { getCollectionId } from './getCollectionId'
export type { AuthPrincipal } from './isAppUser'
export { isAppUser } from './isAppUser'
export { getWorkspaceFromCookie } from './getWorkspaceFromCookie'
export { getUserWorkspaceIds } from './getUserWorkspaceIds'
export { userBelongsToWorkspace } from './userBelongsToWorkspace'
export { userCanAccessActiveWorkspace } from './userCanAccessActiveWorkspace'
export type { SystemRole } from './systemRole'
export { userHasSystemRole, userIsSystemUser } from './systemRole'
export type { WorkspaceRole } from './workspaceRole'
export { userHasWorkspaceRole } from './userHasWorkspaceRole'
export { userIsSystemAdmin } from './userIsSystemAdmin'
export { userIsWorkspaceAdmin } from './userIsWorkspaceAdmin'
