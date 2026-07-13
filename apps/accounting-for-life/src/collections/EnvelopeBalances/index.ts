/**
 * `envelope-balances` — monthly assigned amounts per category (Epic 9 / US-9.1).
 */
import type { CollectionConfig } from 'payload'

import { envelopeBalancesAccess } from '@/access/collections'

const EnvelopeBalances: CollectionConfig = {
  slug: 'envelope-balances',
  access: envelopeBalancesAccess,
  admin: {
    group: 'Budgeting',
    useAsTitle: 'id',
    defaultColumns: ['budget', 'category', 'year', 'month', 'assigned'],
    hidden: true,
  },
  fields: [
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
      index: true,
      label: 'Budget',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      label: 'Category',
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      index: true,
      label: 'Year',
      min: 2000,
      max: 2100,
    },
    {
      name: 'month',
      type: 'number',
      required: true,
      index: true,
      label: 'Month',
      min: 1,
      max: 12,
    },
    {
      name: 'assigned',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Assigned',
      admin: {
        description: 'Amount assigned to this envelope for the month (reporting currency).',
      },
    },
  ],
}

export default EnvelopeBalances
