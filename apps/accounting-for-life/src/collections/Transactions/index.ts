import type { CollectionConfig } from 'payload'

import { transactionsAccess } from '@/access/collections'
import { custom } from '@/lang'

import { hooks } from './hooks'

const Transactions: CollectionConfig = {
  slug: 'transactions',
  access: transactionsAccess,
  labels: {
    singular: custom.collections.transactions.singular,
    plural: custom.collections.transactions.plural,
  },
  versions: {
    maxPerDoc: 50,
  },
  admin: {
    group: custom.adminGroups.ledger,
    useAsTitle: 'memo',
    defaultColumns: ['date', 'type', 'status', 'budget', 'workspace'],
    description: custom.collections.transactions.description,
  },
  hooks,
  fields: [
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'memo',
      type: 'textarea',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'transaction',
      options: [
        { label: custom.fields.transactions.type.transaction, value: 'transaction' },
        { label: custom.fields.transactions.type.transfer, value: 'transfer' },
        { label: custom.fields.transactions.type.adjustment, value: 'adjustment' },
        { label: custom.fields.transactions.type.opening_balance, value: 'opening_balance' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: custom.fields.transactions.status.pending, value: 'pending' },
        { label: custom.fields.transactions.status.posted, value: 'posted' },
      ],
    },
    {
      name: 'postingLines',
      type: 'array',
      virtual: true,
      admin: {
        description: custom.fields.transactions.postingLinesDescription,
      },
      fields: [
        {
          name: 'account',
          type: 'relationship',
          relationTo: 'accounts',
          required: true,
        },
        {
          name: 'amount',
          type: 'number',
          required: true,
          admin: {
            description: custom.fields.transactions.postingLinesAmountDescription,
          },
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
        },
        {
          name: 'sortOrder',
          type: 'number',
        },
      ],
    },
    {
      name: 'entries',
      type: 'join',
      collection: 'transaction-entries',
      on: 'transaction',
      admin: {
        allowCreate: false,
        defaultColumns: ['account', 'amount', 'category', 'unit', 'sortOrder'],
        description: custom.fields.transactions.entriesDescription,
      },
    },
  ],
}

export default Transactions
