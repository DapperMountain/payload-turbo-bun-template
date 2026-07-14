/**
 * `budgets` collection — YNAB-style budget plans scoped to a workspace.
 */
import type { CollectionConfig } from 'payload'

import { budgetsAccess } from '@/access/collections'

import { hooks } from './hooks'

const Budgets: CollectionConfig = {
  slug: 'budgets',
  trash: true,
  // Shallow copy so the multi-tenant plugin can wrap access without mutating the export.
  access: { ...budgetsAccess },
  admin: {
    group: 'Budgeting',
    useAsTitle: 'name',
    defaultColumns: ['name', 'isDefault', 'workspace'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Name',
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      label: 'Default budget',
      defaultValue: false,
      admin: {
        description: 'Primary budget for this household when none is selected.',
      },
    },
  ],
  hooks,
}

export default Budgets
