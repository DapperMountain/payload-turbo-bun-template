'use server'

import { revalidatePath } from 'next/cache'

import { applyCategoryToEntries, type TransactionEntryInput } from '@/collections/Transactions/lib/entries'
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
  memo?: string
  type: Transaction['type']
  entries?: TransactionEntryInput[]
}

export type UpdateTransactionInput = {
  id: string
  date?: string
  memo?: string | null
  notes?: string | null
  status?: Transaction['status']
  type?: Transaction['type']
  entries?: TransactionEntryInput[]
}

export type BulkTransactionHeaderPatch = {
  date?: string
  memo?: string | null
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
        memo: input.memo,
        type: input.type,
        entries: input.entries,
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
    if (input.memo !== undefined) data.memo = input.memo
    if (input.notes !== undefined) data.notes = input.notes
    if (input.status !== undefined) data.status = input.status
    if (input.type !== undefined) data.type = input.type

    if (input.entries) {
      data.entries = input.entries
    } else if (
      existing.status === 'posted' &&
      (input.date !== undefined || input.memo !== undefined || input.notes !== undefined)
    ) {
      // header-only edit on posted tx — no entry rewrite
    }

    await payload.update({
      collection: 'transactions',
      id: input.id,
      data,
      user,
      overrideAccess: false,
      depth: 0,
    })

    if (input.notes !== undefined) {
      const verified = await payload.findByID({
        collection: 'transactions',
        id: input.id,
        depth: 0,
        user,
        overrideAccess: false,
      })

      if ((verified.notes ?? null) !== (input.notes ?? null)) {
        return {
          ok: false,
          error:
            'Notes were not saved. Restart the app container so Payload reloads the notes field, then try again.',
        }
      }
    }

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
    if (input.patch.memo !== undefined) data.memo = input.patch.memo
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
