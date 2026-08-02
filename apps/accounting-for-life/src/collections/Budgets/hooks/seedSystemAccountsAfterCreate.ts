import type { CollectionAfterChangeHook } from 'payload'

import { seedSystemPnlAccounts } from '@/database/seed/system-accounts'

/**
 * Seeds thin system Income + Expense accounts when a budget is first created.
 *
 * Skipped when `context.skipCategorySeed` is set (same gate as category catalog).
 */
export const seedSystemAccountsAfterCreate: CollectionAfterChangeHook = async ({
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
    req.payload.logger.warn(
      '🚨 [Budgets] Created budget without workspace; skipping system account seed.',
    )
    return doc
  }

  await seedSystemPnlAccounts(req.payload, {
    budgetId: doc.id,
    workspaceId,
    req,
  })

  return doc
}
