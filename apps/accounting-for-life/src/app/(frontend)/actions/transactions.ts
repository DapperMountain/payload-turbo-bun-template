'use server'

import { revalidatePath } from 'next/cache'

import { applyCategoryToEntries, type TransactionEntryInput } from '@/collections/Transactions/lib/entries'
import {
  matchAndMergeTransactions,
  pairMatchIds,
} from '@/collections/Transactions/lib/matchAndMergeTransactions'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { getAppPayload } from '@/lib/frontend/payload.server'
import { entriesFromTransaction, transactionEntries } from '@/lib/frontend/transactions.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'
import type { Transaction } from '@/types'
import { getCollectionId } from '@/utils'

export type TransactionEntryInputClient = TransactionEntryInput

export type CreateTransactionInput = {
  budget: string
  date: string
  payee?: string
  type: Transaction['type']
  economicKind?: Transaction['economicKind']
  entries?: TransactionEntryInput[]
  quoteUnit?: string | null
  quoteToReportingRate?: number | null
}

export type UpdateTransactionInput = {
  id: string
  date?: string
  payee?: string | null
  status?: Transaction['status']
  type?: Transaction['type']
  economicKind?: Transaction['economicKind']
  entries?: TransactionEntryInput[]
  quoteUnit?: string | null
  quoteToReportingRate?: number | null
}

export type BulkTransactionHeaderPatch = {
  date?: string
  payee?: string | null
  status?: Transaction['status']
}

export type BulkTransactionResult = {
  ok: true
  updated: number
  errors: { id: string; message: string }[]
}

function workspaceWhere(workspaceId: string, ids: string[]) {
  return {
    and: [{ workspace: { equals: workspaceId } }, { id: { in: ids } }],
  }
}

function mapBulkErrors(
  errors: { id?: string; message: string }[] | undefined,
): { id: string; message: string }[] {
  return (errors ?? []).map((error) => ({
    id: error.id ?? 'unknown',
    message: error.message,
  }))
}

export async function createTransactionAction(
  input: CreateTransactionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getAppPayload()

    await payload.create({
      collection: 'transactions',
      data: {
        workspace: workspace.id,
        budget: input.budget,
        date: input.date,
        payee: input.payee,
        type: input.type,
        ...(input.economicKind !== undefined ? { economicKind: input.economicKind } : {}),
        entries: input.entries,
        ...(input.quoteUnit !== undefined ? { quoteUnit: input.quoteUnit } : {}),
        ...(input.quoteToReportingRate !== undefined
          ? { quoteToReportingRate: input.quoteToReportingRate }
          : {}),
      },
      user,
      overrideAccess: false,
    })

    revalidatePaths(accountIdsFromEntries(input.entries))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create transaction' }
  }
}

export async function updateTransactionAction(
  input: UpdateTransactionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getAppPayload()

    const existing = await payload.findByID({
      collection: 'transactions',
      id: input.id,
      depth: 2,
      user,
      overrideAccess: false,
    })

    if (getCollectionId(existing.workspace) !== workspace.id) {
      return { ok: false, error: 'Transaction not in active workspace' }
    }

    const affectedAccountIds = new Set<string>(
      transactionEntries(existing)
        .map((entry) => getCollectionId(entry.account))
        .filter((id): id is string => Boolean(id)),
    )
    for (const accountId of accountIdsFromEntries(input.entries)) {
      affectedAccountIds.add(accountId)
    }

    const data: Record<string, unknown> = {}

    if (input.date !== undefined) data.date = input.date
    if (input.payee !== undefined) data.payee = input.payee
    if (input.status !== undefined) data.status = input.status
    if (input.type !== undefined) data.type = input.type
    if (input.economicKind !== undefined) data.economicKind = input.economicKind
    if (input.quoteUnit !== undefined) data.quoteUnit = input.quoteUnit
    if (input.quoteToReportingRate !== undefined) {
      data.quoteToReportingRate = input.quoteToReportingRate
    }

    if (input.entries) {
      data.entries = input.entries
    }

    await payload.update({
      collection: 'transactions',
      id: input.id,
      data,
      user,
      overrideAccess: false,
      depth: 0,
    })

    revalidatePaths([...affectedAccountIds])
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to update transaction' }
  }
}

export async function bulkUpdateTransactionsAction(input: {
  ids: string[]
  patch: BulkTransactionHeaderPatch
}): Promise<BulkTransactionResult | { ok: false; error: string }> {
  if (!input.ids.length) {
    return { ok: false, error: 'No transactions selected' }
  }

  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getAppPayload()
    const data: Record<string, unknown> = {}

    if (input.patch.date !== undefined) data.date = input.patch.date
    if (input.patch.payee !== undefined) data.payee = input.patch.payee
    if (input.patch.status !== undefined) data.status = input.patch.status

    if (!Object.keys(data).length) {
      return { ok: false, error: 'No changes to apply' }
    }

    const result = await payload.update({
      collection: 'transactions',
      where: workspaceWhere(workspace.id, input.ids),
      data,
      user,
      overrideAccess: false,
      depth: 0,
    })

    revalidatePaths()
    return {
      ok: true,
      updated: result.docs.length,
      errors: mapBulkErrors(result.errors),
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Bulk update failed' }
  }
}

export async function bulkSetTransactionCategoryAction(input: {
  ids: string[]
  categoryId: string
}): Promise<BulkTransactionResult | { ok: false; error: string }> {
  if (!input.ids.length) {
    return { ok: false, error: 'No transactions selected' }
  }

  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getAppPayload()
    const errors: { id: string; message: string }[] = []
    let updated = 0

    for (const id of input.ids) {
      try {
        const transaction = await payload.findByID({
          collection: 'transactions',
          id,
          depth: 2,
          user,
          overrideAccess: false,
        })

        if (getCollectionId(transaction.workspace) !== workspace.id) {
          errors.push({ id, message: 'Wrong workspace' })
          continue
        }

        const existingEntries = transactionEntries(transaction)
        if (!existingEntries.length) {
          errors.push({ id, message: 'No entries to update' })
          continue
        }

        const nextEntries = applyCategoryToEntries(
          entriesFromTransaction(transaction),
          transaction.type,
          input.categoryId,
          { payee: transaction.payee },
        )

        await payload.update({
          collection: 'transactions',
          id,
          data: { entries: nextEntries },
          user,
          overrideAccess: false,
          depth: 0,
        })

        updated += 1
      } catch (error) {
        errors.push({
          id,
          message: error instanceof Error ? error.message : 'Update failed',
        })
      }
    }

    revalidatePaths()
    return { ok: true, updated, errors }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Bulk category update failed' }
  }
}

export async function deleteTransactionAction(input: {
  id: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getAppPayload()

    const existing = await payload.findByID({
      collection: 'transactions',
      id: input.id,
      depth: 2,
      user,
      overrideAccess: false,
    })

    if (getCollectionId(existing.workspace) !== workspace.id) {
      return { ok: false, error: 'Transaction not in active workspace' }
    }

    const affectedAccountIds = transactionEntries(existing)
      .map((entry) => getCollectionId(entry.account))
      .filter((id): id is string => Boolean(id))

    await payload.delete({
      collection: 'transactions',
      id: input.id,
      user,
      overrideAccess: false,
      depth: 0,
    })

    revalidatePaths(affectedAccountIds)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to delete transaction' }
  }
}

export async function bulkDeleteTransactionsAction(input: {
  ids: string[]
}): Promise<BulkTransactionResult | { ok: false; error: string }> {
  if (!input.ids.length) {
    return { ok: false, error: 'No transactions selected' }
  }

  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getAppPayload()

    const result = await payload.delete({
      collection: 'transactions',
      where: workspaceWhere(workspace.id, input.ids),
      user,
      overrideAccess: false,
      depth: 0,
    })

    revalidatePaths()
    return {
      ok: true,
      updated: result.docs.length,
      errors: mapBulkErrors(result.errors),
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Bulk delete failed' }
  }
}

/** @deprecated Use bulkDeleteTransactionsAction */
export async function bulkDeleteDraftTransactionsAction(input: {
  ids: string[]
}): Promise<BulkTransactionResult | { ok: false; error: string }> {
  return bulkDeleteTransactionsAction(input)
}

/**
 * Match one manual + one imported transaction (US-6.1).
 * Keeps the manual row (absorbing import identity), deletes the import row.
 */
export async function matchTransactionsAction(input: {
  ids: string[]
}): Promise<
  { ok: true; keptId: string; deletedId: string } | { ok: false; error: string }
> {
  try {
    const { user, headers } = await requireAppUser('/transactions')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const ids = pairMatchIds(input.ids)
    const payload = await getAppPayload()

    for (const id of ids) {
      const doc = await payload.findByID({
        collection: 'transactions',
        id,
        depth: 0,
        user,
        overrideAccess: false,
      })
      if (getCollectionId(doc.workspace) !== workspace.id) {
        return { ok: false, error: 'Transaction not in active workspace' }
      }
    }

    const result = await matchAndMergeTransactions({
      payload,
      user,
      ids,
      overrideAccess: false,
    })

    revalidatePaths()
    return { ok: true, ...result }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Match failed' }
  }
}

function revalidatePaths(accountIds?: string[]) {
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/budgets', 'layout')
  revalidatePath('/accounts', 'layout')
  revalidatePath('/accounts/[accountId]', 'page')

  for (const accountId of accountIds ?? []) {
    revalidatePath(`/accounts/${accountId}`)
  }
}

function accountIdsFromEntries(lines?: TransactionEntryInput[]): string[] {
  if (!lines?.length) return []
  return [...new Set(lines.map((line) => line.account))]
}
