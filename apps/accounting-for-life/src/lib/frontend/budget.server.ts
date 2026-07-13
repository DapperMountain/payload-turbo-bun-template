import 'server-only'

import { cache } from 'react'

import { getAppPayload } from '@/lib/frontend/payload.server'
import type { Budget, User } from '@/types'
import { getBudgetFromCookie } from '@/utils/getBudgetFromCookie'

export const listWorkspaceBudgets = cache(async (user: User, workspaceId: string): Promise<Budget[]> => {
  const payload = await getAppPayload()
  const result = await payload.find({
    collection: 'budgets',
    where: { workspace: { equals: workspaceId } },
    limit: 50,
    depth: 0,
    sort: 'name',
    user,
    overrideAccess: false,
  })

  return result.docs
})

export const resolveActiveBudget = cache(async (
  user: User,
  workspaceId: string,
  headers: Headers,
): Promise<Budget | null> => {
  const budgets = await listWorkspaceBudgets(user, workspaceId)
  if (!budgets.length) return null

  const cookieId = getBudgetFromCookie(headers)
  const fromCookie = cookieId ? budgets.find((b) => b.id === cookieId) : undefined
  if (fromCookie) return fromCookie

  const defaultBudget = budgets.find((b) => b.isDefault)
  return defaultBudget ?? budgets[0]!
})
