import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContent,
  isBudgetContentAdmin,
} from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Category groups: members read; budget admins manage structure. */
export const categoryGroupsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: canCreateOnBudget('BUDGET_ADMIN'),
  update: canUpdateOnBudget('BUDGET_ADMIN'),
  delete: requireOne(isSystemAdmin, isBudgetContentAdmin),
}
