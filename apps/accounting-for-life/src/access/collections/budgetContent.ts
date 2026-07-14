import type { CollectionConfig } from 'payload'

import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContent,
  isBudgetContentWriter,
} from '@/access/budgets'

/**
 * Starter access for collections with a `budget` relationship.
 *
 * Read: any budget membership (`Where`).
 * Create: boolean on body `budget` (US-1.3 — Payload create `Where` is not enforced).
 * Update: document `Where` + body `budget` when reassigned.
 * Delete: writers — tighten per collection when needed.
 */
export const budgetContentAccess: NonNullable<CollectionConfig['access']> = {
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: canCreateOnBudget(),
  update: canUpdateOnBudget(),
  delete: requireOne(isSystemAdmin, isBudgetContentWriter),
}
