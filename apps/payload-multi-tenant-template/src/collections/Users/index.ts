/**
 * `users` collection — auth, system roles, and per-tenant membership via the multi-tenant plugin.
 */
import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import type { CollectionConfig } from 'payload'

import { usersAccess } from '@/access/collections'
import { custom } from '@/lang'

import { hooks } from './hooks'

const Users: CollectionConfig = {
  slug: 'users',
  auth: { useAPIKey: true },
  trash: true,
  access: usersAccess,
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
      saveToJWT: true,
      options: [
        { label: custom.roles.SYSTEM_ADMIN, value: 'SYSTEM_ADMIN' },
        { label: custom.roles.SYSTEM_USER, value: 'SYSTEM_USER' },
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
              { label: custom.roles.TENANT_ADMIN, value: 'TENANT_ADMIN' },
              { label: custom.roles.TENANT_USER, value: 'TENANT_USER' },
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
