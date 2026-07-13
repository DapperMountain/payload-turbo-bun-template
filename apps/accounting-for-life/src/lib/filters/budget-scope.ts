import type { FilterClause } from './types'

/** Budget ID when a single-budget `equals` (or lone `in`) filter is active. */
export function activeBudgetIdFromClauses(clauses: FilterClause[]): string | undefined {
  for (const clause of clauses) {
    if (clause.field !== 'budget') continue

    if (clause.operator === 'equals' && typeof clause.value === 'string') {
      return clause.value
    }

    if (
      clause.operator === 'in' &&
      Array.isArray(clause.value) &&
      clause.value.length === 1 &&
      typeof clause.value[0] === 'string'
    ) {
      return clause.value[0]
    }
  }

  return undefined
}

/** Budget ID from a draft filter row (Field → Operator → Value). */
export function budgetIdFromRows(
  rows: Array<{ fieldId: string; values: string[] }>,
  budgetField = 'budget',
): string | undefined {
  const row = rows.find((r) => r.fieldId === budgetField && r.values[0])
  return row?.values[0]
}
