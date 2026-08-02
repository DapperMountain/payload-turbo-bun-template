import type { Account, Category } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/** Seeded names — keep in sync with `database/seed/system-accounts`. */
export const SYSTEM_EXPENSE_ACCOUNT_NAME = 'Budget expenses'
export const SYSTEM_INCOME_ACCOUNT_NAME = 'Budget income'

export type SystemPnlKind = 'expense' | 'income'

export type SystemPnlAccounts = {
  expenseAccountId: string
  incomeAccountId: string
}

export function isSystemPnlAccount(
  account: Pick<Account, 'classification' | 'isSystemDefault'> | null | undefined,
): boolean {
  if (!account?.isSystemDefault) return false
  return account.classification === 'expense' || account.classification === 'income'
}

/** Resolve the thin system Income/Expense chart account for a budget. */
export function systemPnlAccountId(
  accounts: Account[],
  budgetId: string,
  kind: SystemPnlKind,
): string {
  const classification = kind
  const expectedName = kind === 'expense' ? SYSTEM_EXPENSE_ACCOUNT_NAME : SYSTEM_INCOME_ACCOUNT_NAME

  const match =
    accounts.find(
      (account) =>
        getCollectionId(account.budget) === budgetId &&
        account.classification === classification &&
        account.isSystemDefault,
    ) ??
    accounts.find(
      (account) =>
        getCollectionId(account.budget) === budgetId &&
        account.classification === classification &&
        account.name === expectedName,
    )

  if (!match) {
    throw new Error(
      `Missing system ${kind} account for this budget (expected "${expectedName}"). Reseed or create the catalog.`,
    )
  }

  return match.id
}

export function resolveSystemPnlAccounts(
  accounts: Account[],
  budgetId: string,
): SystemPnlAccounts {
  return {
    expenseAccountId: systemPnlAccountId(accounts, budgetId, 'expense'),
    incomeAccountId: systemPnlAccountId(accounts, budgetId, 'income'),
  }
}

/**
 * Pick expense vs income chart account for a categorized leg.
 * Prefer category purpose; otherwise infer from payment sign (outflow → expense).
 */
export function pnlAccountForCategoryLeg(
  systemPnl: SystemPnlAccounts,
  options: {
    paymentTotal: number
    categoryPurpose?: Category['purpose'] | null
  },
): string {
  const purpose = options.categoryPurpose
  if (purpose === 'income') return systemPnl.incomeAccountId
  if (purpose === 'spending' || purpose === 'credit_card_payment') {
    return systemPnl.expenseAccountId
  }
  return options.paymentTotal < 0 ? systemPnl.expenseAccountId : systemPnl.incomeAccountId
}
