import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isBudgetContent, isBudgetContentAdmin, isBudgetContentWriter } from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Members manage on-budget accounts; budget admins retain delete. */
export const accountsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: requireOne(isSystemAdmin, isBudgetContentWriter),
  update: requireOne(isSystemAdmin, isBudgetContentWriter),
  delete: requireOne(isSystemAdmin, isBudgetContentAdmin),
}
