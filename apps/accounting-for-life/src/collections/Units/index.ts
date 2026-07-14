import type { CollectionConfig } from 'payload'

import { unitsAccess } from '@/access/collections'
import { custom } from '@/lang'

import { hooks } from './hooks'

const Units: CollectionConfig = {
  slug: 'units',
  access: { ...unitsAccess },
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
  hooks,
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
      defaultValue: 'fiat',
      options: [
        { label: custom.fields.units.kind.fiat, value: 'fiat' },
        { label: custom.fields.units.kind.crypto, value: 'crypto' },
        { label: custom.fields.units.kind.custom, value: 'custom' },
      ],
      admin: {
        description: custom.fields.units.kindDescription,
      },
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
