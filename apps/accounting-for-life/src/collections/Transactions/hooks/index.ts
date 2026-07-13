import { syncTransactionEntries } from './createTransactionEntries'
import { prepareTransactionPosting } from './prepareTransactionPosting'
import { removeTransactionEntriesOnDelete } from './removeTransactionEntriesOnDelete'

// beforeChange validates postingLines; afterChange writes transaction-entries in the same request.
export const hooks = {
  beforeChange: [prepareTransactionPosting],
  afterChange: [syncTransactionEntries],
  beforeDelete: [removeTransactionEntriesOnDelete],
}
