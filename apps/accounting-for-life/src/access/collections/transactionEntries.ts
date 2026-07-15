import { requireOne } from '@/access/helpers'
import { isSystemAdmin } from '@/access/roles'
import { transactionEntryVisibilityScope } from '@/access/budgets'

/** Legs are written only through the transactions create/update hooks (`entries`). */
export const transactionEntriesAccess = {
  read: requireOne(isSystemAdmin, transactionEntryVisibilityScope),
  create: () => false,
  update: () => false,
  delete: () => false,
}
