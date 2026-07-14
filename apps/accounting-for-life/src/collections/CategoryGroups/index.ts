/**
 * `category-groups` collection — Monarch-style sections (Income, Fixed, …).
 */
import type { CollectionConfig } from 'payload'

import { categoryGroupsAccess } from '@/access/collections'

const CategoryGroups: CollectionConfig = {
  slug: 'category-groups',
  trash: true,
  access: { ...categoryGroupsAccess },
  admin: {
    group: 'Budgeting',
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'budget', 'sortOrder'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      label: 'Kind',
      options: [
        { label: 'Income', value: 'income' },
        { label: 'Expense', value: 'expense' },
        { label: 'Credit card payments', value: 'credit_card_payments' },
      ],
      defaultValue: 'expense',
      admin: {
        description:
          'Credit card payment groups are auto-created when a credit card account is added.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort order',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
      label: 'Budget',
      index: true,
    },
  ],
}

export default CategoryGroups
