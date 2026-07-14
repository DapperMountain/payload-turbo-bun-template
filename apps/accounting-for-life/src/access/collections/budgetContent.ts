import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isBudgetContent, isBudgetContentWriter } from '@/access/budgets'

/**
 * Starter access for collections with a `budget` relationship (US-1.2).
 *
 * Read: any budget membership. Write: admin or member (not readonly).
 * Delete defaults to writers — tighten per collection when needed.
 */
export const budgetContentAccess: NonNullable<CollectionConfig['access']> = {
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: requireOne(isSystemAdmin, isBudgetContentWriter),
  update: requireOne(isSystemAdmin, isBudgetContentWriter),
  delete: requireOne(isSystemAdmin, isBudgetContentWriter),
}
