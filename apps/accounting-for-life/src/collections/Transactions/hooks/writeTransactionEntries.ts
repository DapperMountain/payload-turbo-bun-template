import type { PayloadRequest } from 'payload'

import type { Transaction } from '@/types'

import type { PostingLineInput } from './prepareTransactionPosting'

export async function writeTransactionEntries(
  req: PayloadRequest,
  doc: Transaction,
  postingLines: PostingLineInput[],
): Promise<void> {
  const workspaceId = typeof doc.workspace === 'string' ? doc.workspace : doc.workspace?.id

  if (!workspaceId) {
    throw new Error('Transaction is missing workspace')
  }

  for (const [index, line] of postingLines.entries()) {
    const account = await req.payload.findByID({
      collection: 'accounts',
      id: line.account,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const unitId = typeof account.unit === 'string' ? account.unit : account.unit?.id

    if (!unitId) {
      throw new Error(`Account ${account.id} is missing a unit`)
    }

    await req.payload.create({
      collection: 'transaction-entries',
      data: {
        workspace: workspaceId,
        transaction: doc.id,
        account: line.account,
        category: line.category ?? undefined,
        amount: line.amount,
        unit: unitId,
        sortOrder: line.sortOrder ?? index,
      },
      req,
      overrideAccess: true,
    })
  }
}

export async function deleteTransactionEntries(
  req: PayloadRequest,
  transactionId: string,
): Promise<void> {
  await req.payload.db.deleteMany({
    collection: 'transaction-entries',
    req,
    where: {
      transaction: { equals: transactionId },
    },
  })
}
