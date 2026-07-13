import type { CollectionConfig } from 'payload'

import { accountsAccess } from '@/access/collections'

import { ensureCreditCardPaymentCategory, validateAccountCategory } from './hooks'

const Accounts: CollectionConfig = {
  slug: 'accounts',
  access: accountsAccess,
  versions: {
    maxPerDoc: 50,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'classification', 'subtype', 'budget', 'workspace'],
  },
  hooks: {
    beforeChange: [validateAccountCategory],
    afterChange: [ensureCreditCardPaymentCategory],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'classification',
      type: 'select',
      required: true,
      options: [
        { label: 'Asset', value: 'asset' },
        { label: 'Liability', value: 'liability' },
        { label: 'Equity', value: 'equity' },
        { label: 'Income', value: 'income' },
        { label: 'Expense', value: 'expense' },
      ],
    },
    {
      name: 'subtype',
      type: 'select',
      required: true,
      options: [
        { label: 'Checking', value: 'checking' },
        { label: 'Savings', value: 'savings' },
        { label: 'Cash', value: 'cash' },
        { label: 'Credit card', value: 'credit_card' },
        { label: 'Loan', value: 'loan' },
        { label: 'Holding', value: 'holding' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'unit',
      type: 'relationship',
      relationTo: 'units',
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        description: 'Payment envelope for credit card accounts only.',
      },
    },
    {
      name: 'isOnBudget',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'budget',
      type: 'relationship',
      relationTo: 'budgets',
      required: true,
    },
  ],
}

export default Accounts
