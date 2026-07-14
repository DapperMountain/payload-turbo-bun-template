import type { CollectionBeforeChangeHook } from 'payload'

import {
  normalizeEntryInputs,
  type TransactionEntryInput,
} from '@/collections/Transactions/lib/entries'
import { normalizeTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import type { Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import {
  validateTransactionLinesBalance,
  validateTransferEntries,
} from './validateTransactionLines'

export type { TransactionEntryInput } from '@/collections/Transactions/lib/entries'

async function validateEntryCategories(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  lines: TransactionEntryInput[],
  budgetId: string,
  workspaceId: string,
): Promise<void> {
  for (const line of lines) {
    if (line.category == null || line.category === '') continue

    const category = await req.payload.findByID({
      collection: 'categories',
      id: line.category,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const categoryWorkspace = getCollectionId(category.workspace)
    const categoryBudget = getCollectionId(category.budget)

    if (categoryWorkspace !== workspaceId) {
      throw new Error('Category must belong to the transaction workspace')
    }

    if (categoryBudget !== budgetId) {
      throw new Error('Category must belong to the transaction budget')
    }

    // Income is credited (negative signed amount); expense/spending is debited (positive).
    // An outflow tagged as income puts a positive amount on the income category and inverts Ready to assign.
    if (category.purpose === 'income' && line.amount > 0) {
      throw new Error(
        'Income category entries must be credits (negative amounts). Record income as an inflow.',
      )
    }
  }
}

async function validateEntryAccounts(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  lines: TransactionEntryInput[],
  workspaceId: string,
  budgetId: string,
): Promise<void> {
  for (const line of lines) {
    const account = await req.payload.findByID({
      collection: 'accounts',
      id: line.account,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const accountWorkspace =
      typeof account.workspace === 'string' ? account.workspace : account.workspace?.id
    const accountBudget = typeof account.budget === 'string' ? account.budget : account.budget?.id

    if (accountWorkspace !== workspaceId) {
      throw new Error('All accounts must belong to the transaction workspace')
    }

    if (accountBudget !== budgetId) {
      throw new Error('All accounts must belong to the transaction budget')
    }
  }
}

function stashEntries(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  context: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['context'],
  key: 'entries' | 'replaceEntries',
  lines: TransactionEntryInput[],
): void {
  req.context[key] = lines
  context[key] = lines
}

/**
 * Validates virtual `entries` on create/update, stashes them on `context`, and strips them from persisted data.
 */
export const prepareTransactionPosting: CollectionBeforeChangeHook<Transaction> = async ({
  data,
  originalDoc,
  operation,
  context,
  req,
}) => {
  if (data?.date) {
    data.date = normalizeTransactionDateTime(data.date)
  }

  const rawLines = data?.entries
  const hasEntries = Array.isArray(rawLines) && rawLines.length > 0

  if (operation === 'update') {
    if (rawLines == null) {
      return data
    }

    if (!hasEntries) {
      const { entries: _removed, ...persisted } = data
      return persisted
    }

    const lines = normalizeEntryInputs(rawLines as TransactionEntryInput[])
    const type = (data.type ?? originalDoc?.type) ?? 'transaction'
    const workspaceId =
      typeof (data.workspace ?? originalDoc?.workspace) === 'string'
        ? (data.workspace ?? originalDoc?.workspace)
        : (data.workspace ?? originalDoc?.workspace)?.id
    const budgetId =
      typeof (data.budget ?? originalDoc?.budget) === 'string'
        ? (data.budget ?? originalDoc?.budget)
        : (data.budget ?? originalDoc?.budget)?.id

    if (!workspaceId || !budgetId) {
      throw new Error('Posted transactions require workspace and budget')
    }

    validateTransactionLinesBalance(lines)
    validateTransferEntries(type, lines)
    await validateEntryAccounts(req, lines, workspaceId as string, budgetId as string)
    await validateEntryCategories(req, lines, budgetId as string, workspaceId as string)

    stashEntries(req, context, 'replaceEntries', lines)

    const { entries: _removed, ...persisted } = data
    return persisted
  }

  if (operation !== 'create' || !hasEntries) {
    return data
  }

  const lines = normalizeEntryInputs(rawLines as TransactionEntryInput[])
  const type = data.type ?? 'transaction'

  validateTransactionLinesBalance(lines)
  validateTransferEntries(type, lines)

  const workspaceId = typeof data.workspace === 'string' ? data.workspace : data.workspace?.id
  const budgetId = typeof data.budget === 'string' ? data.budget : data.budget?.id

  if (!workspaceId || !budgetId) {
    throw new Error('Posted transactions require workspace and budget')
  }

  await validateEntryAccounts(req, lines, workspaceId, budgetId)
  await validateEntryCategories(req, lines, budgetId, workspaceId)

  stashEntries(req, context, 'entries', lines)

  const { entries: _removed, ...persisted } = data

  return {
    ...persisted,
    status: 'posted',
  }
}
