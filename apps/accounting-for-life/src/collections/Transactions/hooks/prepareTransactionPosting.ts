import type { CollectionBeforeChangeHook } from 'payload'

import {
  normalizeEntryInputs,
  type TransactionEntryInput,
} from '@/collections/Transactions/lib/entries'
import { normalizeTransactionDateTime } from '@/lib/frontend/transaction-datetime'
import type { Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import {
  validateEntryCompleteness,
  validateTransactionCounterparty,
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

/**
 * Ensures accounts belong to the txn workspace/budget and returns each account’s unit id.
 */
async function loadValidatedAccountUnits(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  lines: TransactionEntryInput[],
  workspaceId: string,
  budgetId: string,
): Promise<Record<string, string>> {
  const unitByAccountId: Record<string, string> = {}

  for (const line of lines) {
    if (unitByAccountId[line.account]) continue

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

    const unitId = getCollectionId(account.unit)
    if (!unitId) {
      throw new Error(`Account ${account.id} is missing a unit`)
    }

    unitByAccountId[line.account] = unitId
  }

  return unitByAccountId
}

async function resolveReportingUnitId(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  workspaceId: string,
): Promise<string | null> {
  const workspace = await req.payload.findByID({
    collection: 'workspaces',
    id: workspaceId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  return getCollectionId(workspace.reportingCurrency)
}

async function resolveQuoteUnitId(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  workspaceId: string,
  quoteUnitRaw: unknown,
): Promise<string | null> {
  const quoteUnitId =
    typeof quoteUnitRaw === 'string'
      ? quoteUnitRaw
      : quoteUnitRaw && typeof quoteUnitRaw === 'object' && 'id' in quoteUnitRaw
        ? String((quoteUnitRaw as { id: string }).id)
        : null

  if (!quoteUnitId) return null

  const unit = await req.payload.findByID({
    collection: 'units',
    id: quoteUnitId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (getCollectionId(unit.workspace) !== workspaceId) {
    throw new Error('Quote unit must belong to the transaction workspace')
  }

  return quoteUnitId
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

async function preparePostedEntries(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  lines: TransactionEntryInput[],
  type: string,
  workspaceId: string,
  budgetId: string,
  quoteUnitId: string | null,
  quoteToReportingRate: number | null | undefined,
): Promise<void> {
  const unitByAccountId = await loadValidatedAccountUnits(req, lines, workspaceId, budgetId)
  const reportingUnitId = await resolveReportingUnitId(req, workspaceId)

  validateEntryCompleteness(lines)
  validateTransactionCounterparty(type, lines)
  validateTransactionLinesBalance(lines, {
    reportingUnitId,
    quoteUnitId,
    quoteToReportingRate,
    unitByAccountId,
  })
  validateTransferEntries(type, lines)
  await validateEntryCategories(req, lines, budgetId, workspaceId)
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

    const quoteUnitRaw = data.quoteUnit !== undefined ? data.quoteUnit : originalDoc?.quoteUnit
    const quoteUnitId = await resolveQuoteUnitId(req, workspaceId as string, quoteUnitRaw)
    const quoteToReportingRate =
      data.quoteToReportingRate !== undefined
        ? data.quoteToReportingRate
        : originalDoc?.quoteToReportingRate

    await preparePostedEntries(
      req,
      lines,
      type,
      workspaceId as string,
      budgetId as string,
      quoteUnitId,
      quoteToReportingRate,
    )

    stashEntries(req, context, 'replaceEntries', lines)

    const { entries: _removed, ...persisted } = data
    return persisted
  }

  if (operation !== 'create' || !hasEntries) {
    return data
  }

  const lines = normalizeEntryInputs(rawLines as TransactionEntryInput[])
  const type = data.type ?? 'transaction'

  const workspaceId = typeof data.workspace === 'string' ? data.workspace : data.workspace?.id
  const budgetId = typeof data.budget === 'string' ? data.budget : data.budget?.id

  if (!workspaceId || !budgetId) {
    throw new Error('Posted transactions require workspace and budget')
  }

  const quoteUnitId = await resolveQuoteUnitId(req, workspaceId, data.quoteUnit)
  const quoteToReportingRate = data.quoteToReportingRate

  await preparePostedEntries(
    req,
    lines,
    type,
    workspaceId,
    budgetId,
    quoteUnitId,
    quoteToReportingRate,
  )

  stashEntries(req, context, 'entries', lines)

  const { entries: _removed, ...persisted } = data

  return {
    ...persisted,
    status: 'posted',
  }
}
