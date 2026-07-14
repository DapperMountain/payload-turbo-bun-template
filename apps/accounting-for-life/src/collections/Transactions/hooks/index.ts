import { syncTransactionEntries } from './createTransactionEntries'
import { prepareTransactionPosting } from './prepareTransactionPosting'
import { removeTransactionEntriesOnDelete } from './removeTransactionEntriesOnDelete'
import { shapeTransactionEntriesOnRead } from './shapeTransactionEntriesOnRead'

// beforeChange validates virtual `entries`; afterChange writes transaction-entries; afterRead shapes `entries` for API.
export const hooks = {
  beforeChange: [prepareTransactionPosting],
  afterChange: [syncTransactionEntries],
  afterRead: [shapeTransactionEntriesOnRead],
  beforeDelete: [removeTransactionEntriesOnDelete],
}
