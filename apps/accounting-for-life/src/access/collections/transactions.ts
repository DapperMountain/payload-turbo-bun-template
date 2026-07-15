import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContentWriter,
  transactionVisibilityScope,
} from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Members create, update, and delete transactions in budgets they can write. */
export const transactionsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, transactionVisibilityScope),
  create: canCreateOnBudget(),
  update: canUpdateOnBudget(),
  delete: requireOne(isSystemAdmin, isBudgetContentWriter),
}
