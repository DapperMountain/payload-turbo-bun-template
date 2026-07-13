import type { CustomTranslationKeys } from '@/lang/types'

/** Payload `where` operators supported by the frontend filter UI. */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'like'
  | 'exists'
  | 'greater_than'
  | 'greater_than_equal'
  | 'less_than'
  | 'less_than_equal'
  | 'between'
  | 'relative'

export type FilterLogic = 'and' | 'or'

export type FilterClause = {
  id: string
  /** How this clause connects to the previous clause (ignored on the first row). */
  logic?: FilterLogic
  field: string
  operator: FilterOperator
  value?: string | string[] | boolean
}

export type FilterFieldType = 'date' | 'select' | 'relationship' | 'text' | 'boolean'

export type FilterFieldOption = {
  value: string
  valueKey?: CustomTranslationKeys
}

export type FilterFieldDefinition = {
  id: string
  labelKey: CustomTranslationKeys
  type: FilterFieldType
  /** Override Payload operators for this field; defaults come from {@link PAYLOAD_FIELD_OPERATORS}. */
  operators?: FilterOperator[]
  options?: FilterFieldOption[]
  relativePresets?: FilterFieldOption[]
}
