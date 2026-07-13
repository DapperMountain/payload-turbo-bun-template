import { workspaceContentScope } from './workspaceContentScope'

/** Read scope for workspace-owned content (any workspace role). */
export const isWorkspaceContent = workspaceContentScope()

/** Row scope where the user has `WORKSPACE_ADMIN` on the document's workspace. */
export const isWorkspaceContentAdmin = workspaceContentScope('WORKSPACE_ADMIN')

/** Row scope where the user has `WORKSPACE_USER` on the document's workspace. */
export const isWorkspaceContentUser = workspaceContentScope('WORKSPACE_USER')
