import type { JournalEntry, User } from '@/types'
import type { Payload, PayloadRequest } from 'payload'

import type { PostJournalEntryInput } from './types'
import { validateJournalLinesBalance, validateTransferLines } from './validateJournalLines'

export type PostJournalEntryOptions = {
  payload: Payload
  user: User
  input: PostJournalEntryInput
  /** When called from a hook, pass the parent request to join the transaction. */
  req?: PayloadRequest
}

/**
 * Creates a posted journal entry and its lines in a single database transaction.
 *
 * Lines are not created through public collection access — this is the only supported write path.
 */
export async function postJournalEntry({
  payload,
  user,
  input,
  req: parentReq,
}: PostJournalEntryOptions): Promise<JournalEntry> {
  validateJournalLinesBalance(input.lines)
  validateTransferLines(input.type, input.lines)

  const accounts = await Promise.all(
    input.lines.map((line) =>
      payload.findByID({
        collection: 'accounts',
        id: line.account,
        depth: 0,
        overrideAccess: true,
      }),
    ),
  )

  for (const account of accounts) {
    const workspaceId =
      typeof account.workspace === 'string' ? account.workspace : account.workspace?.id

    if (workspaceId !== input.workspace) {
      throw new Error('All accounts must belong to the entry workspace')
    }

    const budgetId = typeof account.budget === 'string' ? account.budget : account.budget?.id

    if (budgetId !== input.budget) {
      throw new Error('All accounts must belong to the entry budget')
    }
  }

  const transactionID = parentReq?.transactionID ?? (await payload.db.beginTransaction())

  const req = {
    ...(parentReq ?? {}),
    payload,
    user,
    transactionID,
  } as PayloadRequest

  try {
    const entry = await payload.create({
      collection: 'journal-entries',
      data: {
        workspace: input.workspace,
        budget: input.budget,
        date: input.date,
        memo: input.memo,
        type: input.type,
        status: 'posted',
        transferGroupId: input.transferGroupId,
      },
      req,
      overrideAccess: true,
      user,
    })

    for (const [index, line] of input.lines.entries()) {
      const account = accounts[index]!
      const unitId = typeof account.unit === 'string' ? account.unit : account.unit?.id

      if (!unitId) {
        throw new Error(`Account ${account.id} is missing a unit`)
      }

      await payload.create({
        collection: 'journal-lines',
        data: {
          workspace: input.workspace,
          entry: entry.id,
          account: line.account,
          category: line.category ?? undefined,
          amount: line.amount,
          unit: unitId,
          sortOrder: line.sortOrder ?? index,
        },
        req,
        overrideAccess: true,
        user,
      })
    }

    if (!parentReq?.transactionID && transactionID) {
      await payload.db.commitTransaction(transactionID)
    }

    return entry
  } catch (error) {
    if (!parentReq?.transactionID && transactionID) {
      await payload.db.rollbackTransaction(transactionID)
    }

    throw error
  }
}
