import type { CollectionConfig } from 'payload'

import { journalEntriesAccess } from '@/access/collections'

const JournalEntries: CollectionConfig = {
  slug: 'journal-entries',
  access: journalEntriesAccess,
  versions: {
    maxPerDoc: 50,
  },
  admin: {
    useAsTitle: 'memo',
    defaultColumns: ['date', 'type', 'status', 'budget', 'workspace'],
  },
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
    },
    {
      name: 'memo',
      type: 'text',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'transaction',
      options: [
        { label: 'Transaction', value: 'transaction' },
        { label: 'Transfer', value: 'transfer' },
        { label: 'Adjustment', value: 'adjustment' },
        { label: 'Opening balance', value: 'opening_balance' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Posted', value: 'posted' },
        { label: 'Void', value: 'void' },
      ],
    },
    {
      name: 'transferGroupId',
      type: 'text',
      index: true,
      admin: {
        description: 'Links the two sides of a transfer when posted separately.',
      },
    },
    {
      name: 'voidOf',
      type: 'relationship',
      relationTo: 'journal-entries',
      admin: {
        description: 'When this entry voids another posted entry.',
      },
    },
  ],
}

export default JournalEntries
