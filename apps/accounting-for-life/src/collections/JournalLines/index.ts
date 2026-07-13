import type { CollectionConfig } from 'payload'

import { journalLinesAccess } from '@/access/collections'

const JournalLines: CollectionConfig = {
  slug: 'journal-lines',
  access: journalLinesAccess,
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['entry', 'account', 'amount', 'unit', 'workspace'],
    hidden: true,
  },
  fields: [
    {
      name: 'entry',
      type: 'relationship',
      relationTo: 'journal-entries',
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
        description: 'Signed amount in the line unit (negative = credit, positive = debit).',
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
        description: 'Amount in budget reporting currency when FX applies.',
      },
    },
    {
      name: 'fxRate',
      type: 'number',
      admin: {
        description: 'Exchange rate applied for reportingAmount.',
      },
    },
  ],
}

export default JournalLines
