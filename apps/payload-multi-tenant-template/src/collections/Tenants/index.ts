import { access } from '@/collections/Tenants/access'
import { CollectionConfig } from 'payload'

import { hooks } from './hooks'

const Tenants: CollectionConfig = {
  slug: 'tenants',
  trash: true,
  access,
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
