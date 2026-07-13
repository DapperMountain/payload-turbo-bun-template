import type { CollectionConfig } from 'payload'

import { unitsAccess } from '@/access/collections'

const Units: CollectionConfig = {
  slug: 'units',
  access: unitsAccess,
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'name', 'kind', 'workspace'],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'ISO 4217 code for currency (e.g. USD) or a stable identifier for other units.',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'currency',
      options: [
        { label: 'Currency', value: 'currency' },
        { label: 'Commodity', value: 'commodity' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'decimalPlaces',
      type: 'number',
      required: true,
      defaultValue: 2,
      min: 0,
      max: 18,
    },
    {
      name: 'symbol',
      type: 'text',
    },
  ],
}

export default Units
