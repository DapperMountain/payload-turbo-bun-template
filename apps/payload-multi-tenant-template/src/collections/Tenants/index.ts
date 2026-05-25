/**
 * `tenants` collection — workspace records (name, domain, description).
 */
import type { CollectionConfig } from 'payload'

import { tenantsAccess } from '@/access/collections'

import { hooks } from './hooks'

const Tenants: CollectionConfig = {
  slug: 'tenants',
  trash: true,
  access: tenantsAccess,
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

export default Tenants
