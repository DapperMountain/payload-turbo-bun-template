import type { CollectionAfterChangeHook } from 'payload'

import { addUserBudgetMembership } from '@/utils/addUserBudgetMembership'
import { isAppUser } from '@/utils/isAppUser'
import type { Budget } from '@/types'

/**
 * Grants `BUDGET_ADMIN` to the creating user, and seeds membership for the rest
 * of the workspace (admins → budget admin, users → budget member).
 */
export const grantBudgetMembershipOnCreate: CollectionAfterChangeHook<Budget> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc

  const workspaceId =
    typeof doc.workspace === 'string' ? doc.workspace : doc.workspace?.id

  if (req.user && isAppUser(req.user)) {
    await addUserBudgetMembership(req.payload, {
      userId: req.user.id,
      budgetId: doc.id,
      roles: ['BUDGET_ADMIN'],
      req,
    })
  }

  if (!workspaceId) return doc

  const members = await req.payload.find({
    collection: 'users',
    where: { 'workspaces.workspace': { equals: workspaceId } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
    req,
  })

  for (const member of members.docs) {
    if (req.user && isAppUser(req.user) && member.id === req.user.id) continue

    const workspaceRow = member.workspaces?.find((row) => {
      const id = typeof row.workspace === 'string' ? row.workspace : row.workspace?.id
      return id === workspaceId
    })
    const isWorkspaceAdmin = workspaceRow?.roles?.includes('WORKSPACE_ADMIN')

    await addUserBudgetMembership(req.payload, {
      userId: member.id,
      budgetId: doc.id,
      roles: [isWorkspaceAdmin ? 'BUDGET_ADMIN' : 'BUDGET_MEMBER'],
      req,
    })
  }

  return doc
}
