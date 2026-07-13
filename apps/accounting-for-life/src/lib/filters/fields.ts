import type { FilterFieldDefinition, FilterFieldType, FilterOperator } from './types'

/**
 * Default Payload operators per field type — full surface area, not ClickUp-limited.
 * Individual fields may override via `operators` on {@link FilterFieldDefinition}.
 */
export const PAYLOAD_FIELD_OPERATORS: Record<FilterFieldType, FilterOperator[]> = {
  text: ['equals', 'not_equals', 'contains', 'like', 'exists'],
  select: ['equals', 'not_equals', 'in', 'not_in', 'exists'],
  relationship: ['equals', 'not_equals', 'in', 'not_in', 'exists'],
  date: [
    'equals',
    'not_equals',
    'greater_than',
    'greater_than_equal',
    'less_than',
    'less_than_equal',
    'between',
    'relative',
    'exists',
  ],
  boolean: ['equals', 'exists'],
}

export function operatorsForField(field: FilterFieldDefinition): FilterOperator[] {
  return field.operators ?? PAYLOAD_FIELD_OPERATORS[field.type]
}

/** Transaction list filters — maps to Payload `where` on `transactions` and `transaction-entries`. */
export const transactionFilterFields: FilterFieldDefinition[] = [
  {
    id: 'date',
    labelKey: 'custom:frontend:filters:fields:date',
    type: 'date',
    relativePresets: [
      { value: 'last_7_days', valueKey: 'custom:frontend:filters:relative:last_7_days' },
      { value: 'last_30_days', valueKey: 'custom:frontend:filters:relative:last_30_days' },
      { value: 'last_90_days', valueKey: 'custom:frontend:filters:relative:last_90_days' },
      { value: 'this_month', valueKey: 'custom:frontend:filters:relative:this_month' },
    ],
  },
  {
    id: 'status',
    labelKey: 'custom:frontend:filters:fields:status',
    type: 'select',
    options: [
      { value: 'pending', valueKey: 'custom:fields:transactions:status:pending' },
      { value: 'posted', valueKey: 'custom:fields:transactions:status:posted' },
    ],
  },
  {
    id: 'type',
    labelKey: 'custom:frontend:filters:fields:type',
    type: 'select',
    options: [
      { value: 'transaction', valueKey: 'custom:fields:transactions:type:transaction' },
      { value: 'transfer', valueKey: 'custom:fields:transactions:type:transfer' },
      { value: 'adjustment', valueKey: 'custom:fields:transactions:type:adjustment' },
      { value: 'opening_balance', valueKey: 'custom:fields:transactions:type:opening_balance' },
    ],
  },
  {
    id: 'memo',
    labelKey: 'custom:frontend:filters:fields:memo',
    type: 'text',
  },
  {
    id: 'budget',
    labelKey: 'custom:frontend:filters:fields:budget',
    type: 'relationship',
  },
  {
    id: 'entries.category',
    labelKey: 'custom:frontend:filters:fields:category',
    type: 'relationship',
  },
  {
    id: 'entries.account',
    labelKey: 'custom:frontend:filters:fields:account',
    type: 'relationship',
  },
]

export const budgetFilterFields: FilterFieldDefinition[] = [
  {
    id: 'name',
    labelKey: 'custom:frontend:filters:fields:name',
    type: 'text',
  },
]

export const accountFilterFields: FilterFieldDefinition[] = [
  {
    id: 'name',
    labelKey: 'custom:frontend:filters:fields:name',
    type: 'text',
  },
  {
    id: 'classification',
    labelKey: 'custom:frontend:filters:fields:classification',
    type: 'select',
    options: [
      { value: 'asset', valueKey: 'custom:fields:accounts:classification:asset' },
      { value: 'liability', valueKey: 'custom:fields:accounts:classification:liability' },
      { value: 'equity', valueKey: 'custom:fields:accounts:classification:equity' },
      { value: 'income', valueKey: 'custom:fields:accounts:classification:income' },
      { value: 'expense', valueKey: 'custom:fields:accounts:classification:expense' },
    ],
  },
  {
    id: 'subtype',
    labelKey: 'custom:frontend:filters:fields:subtype',
    type: 'select',
    options: [
      { value: 'checking', valueKey: 'custom:fields:accounts:subtype:checking' },
      { value: 'savings', valueKey: 'custom:fields:accounts:subtype:savings' },
      { value: 'cash', valueKey: 'custom:fields:accounts:subtype:cash' },
      { value: 'credit_card', valueKey: 'custom:fields:accounts:subtype:credit_card' },
      { value: 'loan', valueKey: 'custom:fields:accounts:subtype:loan' },
      { value: 'holding', valueKey: 'custom:fields:accounts:subtype:holding' },
      { value: 'other', valueKey: 'custom:fields:accounts:subtype:other' },
    ],
  },
  {
    id: 'budget',
    labelKey: 'custom:frontend:filters:fields:budget',
    type: 'relationship',
  },
]

/** Operator label keys — typed for `translateFilterKey`. */
export const filterOperatorKeys = {
  equals: 'custom:frontend:filters:operators:equals',
  not_equals: 'custom:frontend:filters:operators:not_equals',
  in: 'custom:frontend:filters:operators:in',
  not_in: 'custom:frontend:filters:operators:not_in',
  contains: 'custom:frontend:filters:operators:contains',
  like: 'custom:frontend:filters:operators:like',
  exists: 'custom:frontend:filters:operators:exists',
  greater_than: 'custom:frontend:filters:operators:greater_than',
  greater_than_equal: 'custom:frontend:filters:operators:greater_than_equal',
  less_than: 'custom:frontend:filters:operators:less_than',
  less_than_equal: 'custom:frontend:filters:operators:less_than_equal',
  between: 'custom:frontend:filters:operators:between',
  relative: 'custom:frontend:filters:operators:relative',
} as const
