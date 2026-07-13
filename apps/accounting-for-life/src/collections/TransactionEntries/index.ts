import type { CollectionConfig } from 'payload'

import { transactionEntriesAccess } from '@/access/collections'
import { custom } from '@/lang'

const TransactionEntries: CollectionConfig = {
  slug: 'transaction-entries',
  access: transactionEntriesAccess,
  labels: {
    singular: custom.collections.transactionEntries.singular,
    plural: custom.collections.transactionEntries.plural,
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['transaction', 'account', 'amount', 'unit', 'workspace'],
    hidden: true,
  },
  fields: [
    {
      name: 'transaction',
      type: 'relationship',
      relationTo: 'transactions',
      required: true,
      index: true,
    },
    {
      name: 'account',
      type: 'relationship',
      relationTo: 'accounts',
      required: true,
      index: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: custom.fields.transactionEntries.amountDescription,
      },
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      required: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'reportingAmount',
      type: 'number',
      admin: {
        description: custom.fields.transactionEntries.reportingAmountDescription,
      },
    },
    {
      name: 'fxRate',
      type: 'number',
      admin: {
        description: custom.fields.transactionEntries.fxRateDescription,
      },
    },
  ],
}

export default TransactionEntries
