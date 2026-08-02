import type { PayloadRequest } from 'payload'

import type { Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

import type { TransactionEntryInput } from '@/collections/Transactions/lib/entries'
import { resolveEntryFx } from '@/collections/Transactions/lib/fx'

export async function writeTransactionEntries(
  req: PayloadRequest,
  doc: Transaction,
  lines: TransactionEntryInput[],
): Promise<void> {
  const workspaceId = typeof doc.workspace === 'string' ? doc.workspace : doc.workspace?.id

  if (!workspaceId) {
    throw new Error('Transaction is missing workspace')
  }

  const workspace = await req.payload.findByID({
    collection: 'workspaces',
    id: workspaceId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const reportingUnitId = getCollectionId(workspace.reportingCurrency)
  const quoteUnitId = getCollectionId(doc.quoteUnit)

  for (const [index, line] of lines.entries()) {
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

    const fx = resolveEntryFx({
      amount: line.amount,
      unitId,
      reportingUnitId,
      quoteUnitId,
      fxRate: line.fxRate,
      quoteToReportingRate: doc.quoteToReportingRate,
    })

    const notes = line.notes?.trim() || undefined
    const payee = line.payee?.trim() || undefined

    await req.payload.create({
      collection: 'transaction-entries',
      data: {
        workspace: workspaceId,
        transaction: doc.id,
        account: line.account,
        category: line.category ?? undefined,
        amount: line.amount,
        ...(payee ? { payee } : {}),
        ...(notes ? { notes } : {}),
        unit: unitId,
        sortOrder: line.sortOrder ?? index,
        reportingAmount: fx.reportingAmount,
        fxRate: fx.fxRate,
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
