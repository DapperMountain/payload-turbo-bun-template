/**
 * `workspaces` collection — household / workspace records (name, domain, description).
 */
import type { CollectionConfig } from 'payload'

import { workspacesAccess } from '@/access/collections'
import { custom } from '@/lang'

import { hooks } from './hooks'

const Workspaces: CollectionConfig = {
  slug: 'workspaces',
  trash: true,
  access: { ...workspacesAccess },
  labels: {
    singular: 'Workspace',
    plural: 'Workspaces',
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Name' },
    { name: 'description', type: 'textarea', required: true, label: 'Description' },
    { name: 'domain', type: 'text', required: true, label: 'Domain' },
    {
      name: 'reportingCurrency',
      type: 'relationship',
      relationTo: 'units',
      admin: {
        description: custom.fields.workspaces.reportingCurrencyDescription,
      },
      filterOptions: ({ id }) => {
        if (!id) return true
        return { workspace: { equals: id } }
      },
    },
  ],
  hooks,
}

export default Workspaces
