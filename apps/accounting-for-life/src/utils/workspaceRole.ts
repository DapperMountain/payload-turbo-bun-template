import type { User } from '@/types'

/** Role on a `user.workspaces[]` row (`WORKSPACE_ADMIN`, `WORKSPACE_USER`). */
export type WorkspaceRole = NonNullable<User['workspaces']>[number]['roles'][number]
