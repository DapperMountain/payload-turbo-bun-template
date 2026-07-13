import type { CollectionConfig } from 'payload'

import { unitsAccess } from '@/access/collections'
import { custom } from '@/lang'

const Units: CollectionConfig = {
  slug: 'units',
  access: unitsAccess,
  labels: {
    singular: custom.collections.units.singular,
    plural: custom.collections.units.plural,
  },
  admin: {
    group: custom.adminGroups.ledger,
    useAsTitle: 'code',
    defaultColumns: ['code', 'name', 'kind', 'workspace'],
    description: custom.collections.units.description,
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: custom.fields.units.codeDescription,
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
        { label: custom.fields.units.kind.currency, value: 'currency' },
        { label: custom.fields.units.kind.commodity, value: 'commodity' },
        { label: custom.fields.units.kind.other, value: 'other' },
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
