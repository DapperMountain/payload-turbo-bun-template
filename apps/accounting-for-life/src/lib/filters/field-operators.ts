import type { CustomTranslationKeys } from '@/lang/types'

import { operatorsForField } from './fields'
import type { FilterFieldDefinition, FilterFieldOption, FilterOperator } from './types'

export type FieldOperatorOption = {
  id: string
  operator: FilterOperator
  labelKey: CustomTranslationKeys
  needsValue: boolean
  existsValue?: boolean
  valueKind?: 'text' | 'date' | 'between' | 'select' | 'relationship' | 'relative' | 'multi'
}

export function getOperatorsForField(field: FilterFieldDefinition): FieldOperatorOption[] {
  const allowed = new Set(operatorsForField(field))
  const ops: FieldOperatorOption[] = []

  const push = (option: FieldOperatorOption) => {
    if (!ops.some((o) => o.id === option.id)) ops.push(option)
  }

  if (allowed.has('relative') && field.type === 'date' && field.relativePresets?.length) {
    push({
      id: 'relative',
      operator: 'relative',
      labelKey: 'custom:frontend:filters:operators:equals',
      needsValue: true,
      valueKind: 'relative',
    })
  }

  if (allowed.has('equals')) {
    push({
      id: 'equals',
      operator: 'equals',
      labelKey: 'custom:frontend:filters:operators:equals',
      needsValue: field.type !== 'boolean',
      valueKind: valueKindForEquals(field),
    })
  }

  if (allowed.has('not_equals')) {
    push({
      id: 'not_equals',
      operator: 'not_equals',
      labelKey: 'custom:frontend:filters:operators:not_equals',
      needsValue: true,
      valueKind:
        field.type === 'select' || field.type === 'relationship'
          ? field.type
          : field.type === 'date'
            ? 'date'
            : 'text',
    })
  }

  if (allowed.has('contains')) {
    push({
      id: 'contains',
      operator: 'contains',
      labelKey: 'custom:frontend:filters:operators:contains',
      needsValue: true,
      valueKind: 'text',
    })
  }

  if (allowed.has('like')) {
    push({
      id: 'like',
      operator: 'like',
      labelKey: 'custom:frontend:filters:operators:like',
      needsValue: true,
      valueKind: 'text',
    })
  }

  if (allowed.has('in')) {
    push({
      id: 'in',
      operator: 'in',
      labelKey: 'custom:frontend:filters:operators:in',
      needsValue: true,
      valueKind: multiOrSingleKind(field),
    })
  }

  if (allowed.has('not_in')) {
    push({
      id: 'not_in',
      operator: 'not_in',
      labelKey: 'custom:frontend:filters:operators:not_in',
      needsValue: true,
      valueKind: multiOrSingleKind(field),
    })
  }

  if (allowed.has('greater_than')) {
    push({
      id: 'greater_than',
      operator: 'greater_than',
      labelKey: 'custom:frontend:filters:operators:greater_than',
      needsValue: true,
      valueKind: 'date',
    })
  }

  if (allowed.has('greater_than_equal')) {
    push({
      id: 'greater_than_equal',
      operator: 'greater_than_equal',
      labelKey: 'custom:frontend:filters:operators:greater_than_equal',
      needsValue: true,
      valueKind: 'date',
    })
  }

  if (allowed.has('less_than')) {
    push({
      id: 'less_than',
      operator: 'less_than',
      labelKey: 'custom:frontend:filters:operators:less_than',
      needsValue: true,
      valueKind: 'date',
    })
  }

  if (allowed.has('less_than_equal')) {
    push({
      id: 'less_than_equal',
      operator: 'less_than_equal',
      labelKey: 'custom:frontend:filters:operators:less_than_equal',
      needsValue: true,
      valueKind: 'date',
    })
  }

  if (allowed.has('between')) {
    push({
      id: 'between',
      operator: 'between',
      labelKey: 'custom:frontend:filters:operators:between',
      needsValue: true,
      valueKind: 'between',
    })
  }

  if (allowed.has('exists')) {
    push({
      id: 'exists-empty',
      operator: 'exists',
      labelKey: 'custom:frontend:filters:isEmpty',
      needsValue: false,
      existsValue: false,
    })
    push({
      id: 'exists-not-empty',
      operator: 'exists',
      labelKey: 'custom:frontend:filters:isNotEmpty',
      needsValue: false,
      existsValue: true,
    })
  }

  return ops
}

function valueKindForEquals(
  field: FilterFieldDefinition,
): FieldOperatorOption['valueKind'] {
  switch (field.type) {
    case 'select':
    case 'relationship':
      return field.type
    case 'date':
      return 'date'
    case 'text':
      return 'text'
    default:
      return undefined
  }
}

function multiOrSingleKind(field: FilterFieldDefinition): FieldOperatorOption['valueKind'] {
  if (field.type === 'select' || field.type === 'relationship') return 'multi'
  return 'text'
}

export function getOperatorOption(
  field: FilterFieldDefinition | undefined,
  operatorKey: string,
): FieldOperatorOption | undefined {
  if (!field) return undefined
  return getOperatorsForField(field).find((op) => op.id === operatorKey)
}

export function getValueOptions(
  field: FilterFieldDefinition,
  operatorOption: FieldOperatorOption,
): FilterFieldOption[] {
  if (operatorOption.valueKind === 'relative') {
    return field.relativePresets ?? []
  }

  if (operatorOption.valueKind === 'select' || operatorOption.valueKind === 'multi') {
    return field.options ?? []
  }

  return []
}

export function clauseToOperatorKey(clause: {
  operator: FilterOperator
  value?: string | string[] | boolean
}): string {
  if (clause.operator === 'exists') {
    return clause.value ? 'exists-not-empty' : 'exists-empty'
  }

  if (clause.operator === 'relative') {
    return 'relative'
  }

  return clause.operator
}

export function isMultiValueOperator(operatorKey: string): boolean {
  return operatorKey === 'in' || operatorKey === 'not_in'
}
