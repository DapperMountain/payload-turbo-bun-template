import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  accountVisibilityScope,
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContentAdmin,
} from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Members manage on-budget accounts; visibility filters read (US-3.2). */
export const accountsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, accountVisibilityScope),
  create: canCreateOnBudget(),
  update: canUpdateOnBudget(),
  delete: requireOne(isSystemAdmin, isBudgetContentAdmin),
}
