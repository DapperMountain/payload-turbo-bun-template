import 'server-only'

import type { Payload } from 'payload'

import type { FilterClause } from '@/lib/filters/types'
import type { User } from '@/types'
import { getCollectionId } from '@/utils'

export function accountEntryFilterClause(accountId: string): FilterClause {
  return {
    id: 'account',
    field: 'entries.account',
    operator: 'equals',
    value: accountId,
    logic: 'and',
  }
}

export function mergeAccountTransactionFilters(
  clauses: FilterClause[],
  accountId: string,
): FilterClause[] {
  const withoutAccount = clauses.filter((clause) => clause.field !== 'entries.account')
  return [accountEntryFilterClause(accountId), ...withoutAccount]
}

export async function sumPostedAccountBalance(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    accountId: string
  },
): Promise<{ balance: number; transactionCount: number }> {
  const entries = await payload.find({
    collection: 'transaction-entries',
    where: {
      and: [
        { workspace: { equals: options.workspaceId } },
        { account: { equals: options.accountId } },
      ],
    },
    limit: 5000,
    depth: 1,
    user: options.user,
    overrideAccess: false,
    pagination: false,
  })

  const transactionIds = new Set<string>()
  let balance = 0

  for (const entry of entries.docs) {
    const transaction = entry.transaction
    if (!transaction || typeof transaction !== 'object') continue
    if (transaction.status !== 'posted') continue

    balance += entry.amount
    transactionIds.add(transaction.id)
  }

  return { balance, transactionCount: transactionIds.size }
}

export function accountBudgetId(account: { budget?: string | { id: string } | null }): string | null {
  return getCollectionId(account.budget)
}
