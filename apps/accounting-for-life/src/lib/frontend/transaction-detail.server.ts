import 'server-only'

import { notFound, redirect } from 'next/navigation'
import type { User } from 'payload'

import { getAppPayload } from '@/lib/frontend/payload.server'
import { findPayeesByBudget } from '@/lib/frontend/transaction-payees.server'
import type { TransactionDialogView } from '@/lib/frontend/transaction-splits'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'
import type { Account, Category, Transaction, Unit } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

export type TransactionDetailPageData = {
  transaction: Transaction
  accounts: Account[]
  accountLabels: Record<string, string>
  categories: Category[]
  payeeOptionsByBudget: Record<string, string[]>
  reportingCurrencyId: string | null
  units: Unit[]
  initialView: TransactionDialogView | undefined
}

export async function loadTransactionDetailPageData(args: {
  transactionId: string
  user: User
  headers: Headers
  viewParam?: string
}): Promise<TransactionDetailPageData> {
  const { transactionId, user, headers, viewParam } = args
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  const payload = await getAppPayload()

  let transaction: Transaction
  try {
    transaction = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 3,
      user,
      overrideAccess: false,
    })
  } catch {
    notFound()
  }

  if (getCollectionId(transaction.workspace) !== workspace.id) {
    notFound()
  }

  const [accounts, categories, units, payeeOptionsByBudget] = await Promise.all([
    payload.find({
      collection: 'accounts',
      where: { workspace: { equals: workspace.id } },
      limit: 100,
      depth: 0,
      sort: 'name',
      user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'categories',
      where: { workspace: { equals: workspace.id } },
      limit: 500,
      depth: 1,
      sort: 'name',
      user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'units',
      where: { workspace: { equals: workspace.id } },
      limit: 100,
      depth: 0,
      user,
      overrideAccess: false,
    }),
    findPayeesByBudget(payload, { user, workspaceId: workspace.id }),
  ])

  const accountLabels = Object.fromEntries(accounts.docs.map((account) => [account.id, account.name]))
  const reportingCurrencyId = getCollectionId(workspace.reportingCurrency)

  const initialView =
    viewParam === 'split' || viewParam === 'swap' || viewParam === 'standard'
      ? viewParam
      : undefined

  return {
    transaction,
    accounts: accounts.docs,
    accountLabels,
    categories: categories.docs,
    payeeOptionsByBudget,
    reportingCurrencyId,
    units: units.docs,
    initialView,
  }
}
