import type { FilterOperator } from './types'

export type RelationshipFilterOption = {
  id: string
  label: string
  /** Section header in grouped pickers (e.g. budget name). */
  group?: string
  /** Same display name across budgets — filter with `in` / `not_in` over these IDs. */
  matchIds?: string[]
}

export function formatRelationshipOptionLabel(option: RelationshipFilterOption): string {
  return option.group ? `${option.label} · ${option.group}` : option.label
}

export function findRelationshipOptionForValue(
  options: RelationshipFilterOption[],
  value: string | string[] | boolean | undefined,
): RelationshipFilterOption | undefined {
  if (value === undefined || typeof value === 'boolean') return undefined

  const ids = Array.isArray(value) ? value : [value]
  if (!ids.length) return undefined

  const exact = options.find((option) => {
    const match = option.matchIds ?? [option.id]
    return match.length === ids.length && match.every((id) => ids.includes(id))
  })
  if (exact) return exact

  return options.find((option) => option.id === ids[0])
}

export function relationshipClauseValue(
  operator: FilterOperator,
  option: RelationshipFilterOption,
): { operator: FilterOperator; value: string | string[] } {
  const ids = option.matchIds ?? [option.id]
  const multi = ids.length > 1

  if (operator === 'equals' && multi) return { operator: 'in', value: ids }
  if (operator === 'not_equals' && multi) return { operator: 'not_in', value: ids }

  return { operator, value: multi && (operator === 'in' || operator === 'not_in') ? ids : option.id }
}

export function expandRelationshipPickerValues(
  fieldId: string,
  values: string[],
  relationshipOptions: Record<string, RelationshipFilterOption[]>,
): string[] {
  const options = relationshipOptions[fieldId] ?? []
  const ids = new Set<string>()

  for (const value of values) {
    const option = options.find((o) => o.id === value)
    if (!option) {
      ids.add(value)
      continue
    }
    for (const id of option.matchIds ?? [option.id]) {
      ids.add(id)
    }
  }

  return [...ids]
}

export function rowValueForRelationshipClause(
  clause: { operator: FilterOperator; value?: string | string[] | boolean },
  options: RelationshipFilterOption[],
): string[] {
  const option = findRelationshipOptionForValue(options, clause.value)
  if (option) return [option.id]

  if (Array.isArray(clause.value)) return clause.value
  if (typeof clause.value === 'string') return [clause.value]
  return []
}
