import type { CollectionConfig } from 'payload'

import { transactionsAccess } from '@/access/collections'
import { custom } from '@/lang'

import { matchTransactionsEndpoint } from './endpoints/match'
import { hooks } from './hooks'

const Transactions: CollectionConfig = {
  slug: 'transactions',
  access: { ...transactionsAccess },
  labels: {
    singular: custom.collections.transactions.singular,
    plural: custom.collections.transactions.plural,
  },
  versions: {
    maxPerDoc: 50,
  },
  admin: {
    group: custom.adminGroups.ledger,
    useAsTitle: 'date',
    defaultColumns: ['date', 'type', 'status', 'budget', 'workspace'],
    description: custom.collections.transactions.description,
  },
  endpoints: [matchTransactionsEndpoint],
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
      name: 'economicKind',
      type: 'select',
      options: [
        { label: custom.fields.transactions.economicKind.buy, value: 'buy' },
        { label: custom.fields.transactions.economicKind.sell, value: 'sell' },
        { label: custom.fields.transactions.economicKind.transfer, value: 'transfer' },
      ],
      admin: {
        description: custom.fields.transactions.economicKindDescription,
      },
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
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: custom.fields.transactions.source.manual, value: 'manual' },
        { label: custom.fields.transactions.source.import, value: 'import' },
      ],
      admin: {
        description: custom.fields.transactions.sourceDescription,
      },
    },
    {
      name: 'externalId',
      type: 'text',
      index: true,
      admin: {
        description: custom.fields.transactions.externalIdDescription,
      },
    },
    {
      name: 'importBatch',
      type: 'text',
      index: true,
      admin: {
        description: custom.fields.transactions.importBatchDescription,
      },
    },
    {
      name: 'quoteUnit',
      type: 'relationship',
      relationTo: 'units',
      admin: {
        description: custom.fields.transactions.quoteUnitDescription,
      },
    },
    {
      name: 'quoteToReportingRate',
      type: 'number',
      admin: {
        description: custom.fields.transactions.quoteToReportingRateDescription,
      },
    },
    {
      name: 'entries',
      type: 'array',
      virtual: true,
      admin: {
        description: custom.fields.transactions.entriesDescription,
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
            description: custom.fields.transactions.entryAmountDescription,
          },
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
        },
        {
          name: 'payee',
          type: 'text',
          admin: {
            description: custom.fields.transactionEntries.payeeDescription,
          },
        },
        {
          name: 'notes',
          type: 'textarea',
          admin: {
            description: custom.fields.transactionEntries.notesDescription,
          },
        },
        {
          name: 'sortOrder',
          type: 'number',
        },
        {
          name: 'fxRate',
          type: 'number',
          admin: {
            description: custom.fields.transactions.entryFxRateDescription,
          },
        },
      ],
    },
    {
      name: 'entryJoin',
      type: 'join',
      collection: 'transaction-entries',
      on: 'transaction',
      admin: {
        hidden: true,
        allowCreate: false,
        defaultColumns: ['account', 'amount', 'category', 'unit', 'sortOrder'],
      },
    },
  ],
}

export default Transactions
