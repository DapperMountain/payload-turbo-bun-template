import type { CollectionAfterChangeHook } from 'payload'

import { seedCategories } from '@/database/seed/categories'

const seedCategoriesAfterCreate: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'create' || context.skipCategorySeed) {
    return doc
  }

  const workspaceId = typeof doc.workspace === 'string' ? doc.workspace : doc.workspace?.id

  if (!workspaceId) {
    req.payload.logger.warn('🚨 [Budgets] Created budget without workspace; skipping category seed.')
    return doc
  }

  await seedCategories(req.payload, {
    budgetId: doc.id,
    workspaceId,
    req,
  })

  return doc
}

export const hooks = {
  afterChange: [seedCategoriesAfterCreate],
}
