import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import { CollectionConfig } from 'payload'

import { app } from '@/lang/en'

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
    { name: 'firstName', type: 'text', required: true, label: 'First name' },
    { name: 'lastName', type: 'text', required: true, label: 'Last name' },
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
      label: 'Roles',
      defaultValue: ['SYSTEM_USER'],
      hasMany: true,
      options: [
        { label: app.roles.SYSTEM_ADMIN, value: 'SYSTEM_ADMIN' },
        { label: app.roles.SYSTEM_USER, value: 'SYSTEM_USER' },
      ],
    },
    {
      ...tenantsArrayField({
        rowFields: [
          {
            name: 'roles',
            type: 'select',
            label: 'Roles',
            defaultValue: ['TENANT_USER'],
            hasMany: true,
            options: [
              { label: app.roles.TENANT_ADMIN, value: 'TENANT_ADMIN' },
              { label: app.roles.TENANT_USER, value: 'TENANT_USER' },
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
