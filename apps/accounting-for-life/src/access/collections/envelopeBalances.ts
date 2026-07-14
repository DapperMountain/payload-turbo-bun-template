import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import {
  canCreateOnBudget,
  canUpdateOnBudget,
  isBudgetContent,
} from '@/access/budgets'

import { budgetContentAccess } from './budgetContent'

/** Envelope balances: writers mutate; permanent delete stays system-admin-only. */
export const envelopeBalancesAccess = {
  ...budgetContentAccess,
  read: requireOne(isSystemAdmin, isBudgetContent),
  create: canCreateOnBudget(),
  update: canUpdateOnBudget(),
  delete: isSystemAdmin,
}
