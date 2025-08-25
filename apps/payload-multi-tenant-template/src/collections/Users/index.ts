import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import { CollectionConfig } from 'payload'
import { access } from './access'
import { hooks } from './hooks'

const Users: CollectionConfig = {
  slug: 'users',
  auth: { useAPIKey: true },
  trash: true,
  access,
  versions: true,
  admin: { useAsTitle: 'fullName', listSearchableFields: ['firstName', 'lastName'] },
  fields: [
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text', required: true },
    {
      name: 'fullName',
      type: 'text',
      virtual: true,
      admin: { hidden: true },
      hooks: { afterRead: [({ data }) => `${data?.firstName} ${data?.lastName}`] },
    },
    {
      admin: { position: 'sidebar' },
      name: 'roles',
      type: 'select',
      defaultValue: ['SYSTEM_USER'],
      hasMany: true,
      options: [
        { label: 'System Admin', value: 'SYSTEM_ADMIN' },
        { label: 'System User', value: 'SYSTEM_USER' },
      ],
    },
    {
      ...tenantsArrayField({
        rowFields: [
          {
            name: 'roles',
            type: 'select',
            defaultValue: ['TENANT_USER'],
            hasMany: true,
            options: [
              { label: 'Tenant Admin', value: 'TENANT_ADMIN' },
              { label: 'Tenant User', value: 'TENANT_USER' },
            ],
            required: true,
          },
        ],
      }),
      admin: { position: 'sidebar' },
    },
  ],
  hooks,
}

export default Users
