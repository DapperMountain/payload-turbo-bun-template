/**
 * `workspaces` collection — household / workspace records (name, domain, description).
 */
import type { CollectionConfig } from 'payload'

import { workspacesAccess } from '@/access/collections'

import { hooks } from './hooks'

const Workspaces: CollectionConfig = {
  slug: 'workspaces',
  trash: true,
  access: workspacesAccess,
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
  ],
  hooks,
}

export default Workspaces
