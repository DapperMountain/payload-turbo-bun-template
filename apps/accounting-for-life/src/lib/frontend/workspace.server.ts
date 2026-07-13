import 'server-only'

import { cache } from 'react'

import { getAppPayload } from '@/lib/frontend/payload.server'
import type { User, Workspace } from '@/types'
import { getCollectionId, getUserWorkspaceIds, userIsSystemAdmin } from '@/utils'
import { getWorkspaceFromCookie } from '@/utils/getWorkspaceFromCookie'

const getAccessibleWorkspaceIds = cache(async (user: User): Promise<Workspace['id'][]> => {
  const membershipIds = getUserWorkspaceIds(user)

  if (membershipIds.length) {
    return membershipIds
  }

  if (!userIsSystemAdmin(user)) {
    return []
  }

  const payload = await getAppPayload()
  const result = await payload.find({
    collection: 'workspaces',
    limit: 100,
    depth: 0,
    sort: 'name',
    user,
    overrideAccess: false,
  })

  return result.docs.map((workspace) => workspace.id)
})

export const resolveActiveWorkspace = cache(async (
  user: User,
  headers: Headers,
): Promise<Workspace | null> => {
  const workspaceIds = await getAccessibleWorkspaceIds(user)

  if (!workspaceIds.length) return null

  const payload = await getAppPayload()
  const cookieId = getWorkspaceFromCookie(headers, 'text')
  const activeId: Workspace['id'] =
    cookieId && workspaceIds.includes(cookieId as Workspace['id'])
      ? (cookieId as Workspace['id'])
      : workspaceIds[0]!

  try {
    return await payload.findByID({
      collection: 'workspaces',
      id: activeId,
      depth: 0,
      user,
      overrideAccess: false,
    })
  } catch {
    return null
  }
})

export const listUserWorkspaces = cache(async (user: User): Promise<Workspace[]> => {
  const workspaceIds = await getAccessibleWorkspaceIds(user)

  if (!workspaceIds.length) return []

  const payload = await getAppPayload()

  const result = await payload.find({
    collection: 'workspaces',
    where: { id: { in: workspaceIds } },
    limit: workspaceIds.length,
    depth: 0,
    sort: 'name',
    user,
    overrideAccess: false,
  })

  return result.docs
})

export function workspaceLabel(workspace: Workspace): string {
  return workspace.name ?? getCollectionId(workspace) ?? ''
}
