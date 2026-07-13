import type { CollectionAfterChangeHook } from 'payload'

import { seedCategories } from '@/database/seed/categories'

/**
 * Seeds the default Income + expense category catalog when a budget is first created.
 *
 * Skipped when `context.skipCategorySeed` is set (integration tests, manual backfill).
 */
export const seedCategoriesAfterCreate: CollectionAfterChangeHook = async ({
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

  // Idempotent catalog insert — see `src/database/seed/categories/`.
  await seedCategories(req.payload, {
    budgetId: doc.id,
    workspaceId,
    req,
  })

  return doc
}
