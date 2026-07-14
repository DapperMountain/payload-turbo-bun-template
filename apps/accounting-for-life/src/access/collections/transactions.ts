import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContent,
  isBudgetContentWriter,
} from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Members create, update, and delete transactions in budgets they can write. */
export const transactionsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: canCreateOnBudget(),
  update: canUpdateOnBudget(),
  delete: requireOne(isSystemAdmin, isBudgetContentWriter),
}
