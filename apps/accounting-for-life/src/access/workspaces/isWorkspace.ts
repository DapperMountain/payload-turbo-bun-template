import { workspaceScope } from './workspaceScope'

/** Read/update scope for any workspace the user belongs to (any workspace role). */
export const isWorkspace = workspaceScope()
