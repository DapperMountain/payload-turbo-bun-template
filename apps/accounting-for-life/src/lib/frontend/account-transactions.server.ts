import 'server-only'

import type { Payload } from 'payload'

import type { FilterClause } from '@/lib/filters/types'
import { sumSignedAmounts } from '@/lib/ledger/account-balance'
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

type PostedEntryDoc = {
  amount: number
  account: string | { id: string } | null | undefined
  transaction: string | { id: string; status?: string } | null | undefined
}

function isPostedEntry(entry: PostedEntryDoc): entry is PostedEntryDoc & {
  transaction: { id: string; status: 'posted' }
} {
  const transaction = entry.transaction
  return typeof transaction === 'object' && transaction !== null && transaction.status === 'posted'
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
  const postedAmounts: number[] = []

  for (const entry of entries.docs) {
    if (!isPostedEntry(entry)) continue
    postedAmounts.push(entry.amount)
    transactionIds.add(entry.transaction.id)
  }

  return {
    balance: sumSignedAmounts(postedAmounts),
    transactionCount: transactionIds.size,
  }
}

/** Posted balances keyed by account id (one workspace query). */
export async function sumPostedBalancesByAccount(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    accountIds: string[]
  },
): Promise<Map<string, number>> {
  const balances = new Map<string, number>()
  for (const id of options.accountIds) {
    balances.set(id, 0)
  }

  if (!options.accountIds.length) return balances

  const entries = await payload.find({
    collection: 'transaction-entries',
    where: {
      and: [
        { workspace: { equals: options.workspaceId } },
        { account: { in: options.accountIds } },
      ],
    },
    limit: 10000,
    depth: 1,
    user: options.user,
    overrideAccess: false,
    pagination: false,
  })

  for (const entry of entries.docs) {
    if (!isPostedEntry(entry)) continue
    const accountId = getCollectionId(entry.account)
    if (!accountId || !balances.has(accountId)) continue
    balances.set(accountId, (balances.get(accountId) ?? 0) + entry.amount)
  }

  return balances
}

export function accountBudgetId(account: { budget?: string | { id: string } | null }): string | null {
  return getCollectionId(account.budget)
}
