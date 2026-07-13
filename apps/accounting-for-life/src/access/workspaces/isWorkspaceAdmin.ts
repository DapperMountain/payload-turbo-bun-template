import { workspaceScope } from './workspaceScope'

/** Row-level scope for workspaces where the user has the `WORKSPACE_ADMIN` role. */
export const isWorkspaceAdmin = workspaceScope('WORKSPACE_ADMIN')
