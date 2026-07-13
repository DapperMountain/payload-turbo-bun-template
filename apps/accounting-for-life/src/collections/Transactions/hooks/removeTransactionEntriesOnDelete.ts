import type { CollectionBeforeDeleteHook } from 'payload'

import type { Transaction } from '@/types'

import { deleteTransactionEntries } from './writeTransactionEntries'

export const removeTransactionEntriesOnDelete: CollectionBeforeDeleteHook<Transaction> = async ({
  id,
  req,
}) => {
  await deleteTransactionEntries(req, String(id))
}
