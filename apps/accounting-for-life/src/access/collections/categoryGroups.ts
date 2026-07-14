import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isBudgetContent, isBudgetContentAdmin } from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Category groups: members read; budget admins manage structure. */
export const categoryGroupsAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: requireOne(isSystemAdmin, isBudgetContentAdmin),
  update: requireOne(isSystemAdmin, isBudgetContentAdmin),
  delete: requireOne(isSystemAdmin, isBudgetContentAdmin),
}
