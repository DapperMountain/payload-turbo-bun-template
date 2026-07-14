import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { isBudgetContent, isBudgetContentWriter } from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Members assign monthly envelope amounts; delete stays system-admin-only. */
export const envelopeBalancesAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: requireOne(isSystemAdmin, isBudgetContentWriter),
  update: requireOne(isSystemAdmin, isBudgetContentWriter),
  delete: isSystemAdmin,
}
