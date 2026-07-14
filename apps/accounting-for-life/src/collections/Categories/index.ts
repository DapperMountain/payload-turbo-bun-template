/**
 * `categories` collection — budget line items within a category group.
 */
import type { CollectionConfig } from 'payload'

import { categoriesAccess } from '@/access/collections'

const Categories: CollectionConfig = {
  slug: 'categories',
  trash: true,
  access: { ...categoriesAccess },
  admin: {
    group: 'Budgeting',
    useAsTitle: 'name',
    defaultColumns: ['emoji', 'name', 'categoryGroup', 'purpose', 'sortOrder'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'emoji',
      type: 'text',
      label: 'Emoji',
      admin: {
        description: 'Single emoji shown in the category list.',
      },
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      label: 'Purpose',
      options: [
        { label: 'Income', value: 'income' },
        { label: 'Spending', value: 'spending' },
        { label: 'Credit card payment', value: 'credit_card_payment' },
      ],
      defaultValue: 'spending',
    },
    {
      name: 'isSystemDefault',
      type: 'checkbox',
      label: 'System default',
      defaultValue: false,
      admin: {
        description: 'Seeded catalog entry; user may customize or hide later.',
        position: 'sidebar',
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
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      required: true,
      label: 'Category group',
      index: true,
    },
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
      label: 'Budget',
      index: true,
      admin: {
        description: 'Denormalized for queries; must match the selected group’s budget.',
      },
    },
  ],
}

export default Categories
