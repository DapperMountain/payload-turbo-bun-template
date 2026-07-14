import type { CollectionBeforeChangeHook } from 'payload'

import type { Budget } from '@/types'

/**
 * Ensures at most one default budget per workspace when `isDefault` is set true.
 */
export const enforceSingleDefaultBudget: CollectionBeforeChangeHook<Budget> = async ({
  data,
  originalDoc,
  operation,
  context,
  req,
}) => {
  if (context?.skipDefaultBudgetEnforcement) {
    return data
  }

  const isDefault = data?.isDefault ?? originalDoc?.isDefault
  if (!isDefault) {
    return data
  }

  const workspaceId =
    typeof (data?.workspace ?? originalDoc?.workspace) === 'string'
      ? (data?.workspace ?? originalDoc?.workspace)
      : (data?.workspace ?? originalDoc?.workspace)?.id

  if (!workspaceId) {
    return data
  }

  const exceptId = operation === 'update' ? originalDoc?.id : undefined

  const existing = await req.payload.find({
    collection: 'budgets',
    where: {
      and: [
        { workspace: { equals: workspaceId } },
        { isDefault: { equals: true } },
        ...(exceptId ? [{ id: { not_equals: exceptId } }] : []),
      ],
    },
    limit: 50,
    depth: 0,
    overrideAccess: true,
    req,
  })

  for (const budget of existing.docs) {
    await req.payload.update({
      collection: 'budgets',
      id: budget.id,
      data: { isDefault: false },
      req,
      overrideAccess: true,
      context: { skipDefaultBudgetEnforcement: true },
    })
  }

  return data
}
