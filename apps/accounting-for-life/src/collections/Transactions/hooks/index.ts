import { syncTransactionEntries } from './createTransactionEntries'
import { prepareTransactionPosting } from './prepareTransactionPosting'
import { removeTransactionEntriesOnDelete } from './removeTransactionEntriesOnDelete'
import { shapeTransactionEntriesOnRead } from './shapeTransactionEntriesOnRead'
import { validateUniqueExternalId } from './validateUniqueExternalId'

// beforeValidate: unique externalId; beforeChange: entries; afterChange writes legs; afterRead shapes entries.
export const hooks = {
  beforeValidate: [validateUniqueExternalId],
  beforeChange: [prepareTransactionPosting],
  afterChange: [syncTransactionEntries],
  afterRead: [shapeTransactionEntriesOnRead],
  beforeDelete: [removeTransactionEntriesOnDelete],
}
