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
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
    },
  ],
  hooks,
}

export default Tenants
