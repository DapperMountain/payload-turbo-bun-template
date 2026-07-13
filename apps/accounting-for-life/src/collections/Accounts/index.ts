import type { CollectionConfig } from 'payload'

import { accountsAccess } from '@/access/collections'
import { custom } from '@/lang'

import { hooks } from './hooks'

const Accounts: CollectionConfig = {
  slug: 'accounts',
  access: accountsAccess,
  labels: {
    singular: custom.collections.accounts.singular,
    plural: custom.collections.accounts.plural,
  },
  versions: {
    maxPerDoc: 50,
  },
  admin: {
    group: custom.adminGroups.ledger,
    useAsTitle: 'name',
    defaultColumns: ['name', 'classification', 'subtype', 'budget', 'workspace'],
    description: custom.collections.accounts.description,
  },
  hooks,
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
        { label: custom.fields.accounts.classification.asset, value: 'asset' },
        { label: custom.fields.accounts.classification.liability, value: 'liability' },
        { label: custom.fields.accounts.classification.equity, value: 'equity' },
        { label: custom.fields.accounts.classification.income, value: 'income' },
        { label: custom.fields.accounts.classification.expense, value: 'expense' },
      ],
    },
    {
      name: 'subtype',
      type: 'select',
      required: true,
      options: [
        { label: custom.fields.accounts.subtype.checking, value: 'checking' },
        { label: custom.fields.accounts.subtype.savings, value: 'savings' },
        { label: custom.fields.accounts.subtype.cash, value: 'cash' },
        { label: custom.fields.accounts.subtype.credit_card, value: 'credit_card' },
        { label: custom.fields.accounts.subtype.loan, value: 'loan' },
        { label: custom.fields.accounts.subtype.holding, value: 'holding' },
        { label: custom.fields.accounts.subtype.other, value: 'other' },
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
        description: custom.fields.accounts.categoryDescription,
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
