import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContent,
  isBudgetContentAdmin,
} from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Members manage on-budget accounts; budget admins retain delete. */
export const accountsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: canCreateOnBudget(),
  update: canUpdateOnBudget(),
  delete: requireOne(isSystemAdmin, isBudgetContentAdmin),
}
