import type { Where } from 'payload'

import { dateQueryBound, dateRangeEndBound, dateRangeStartBound } from '@/lib/frontend/transaction-datetime'
import type { FilterClause, FilterLogic, FilterOperator } from './types'

const FILTERS_PARAM = 'filters'

export function parseFiltersParam(raw: string | string[] | undefined): FilterClause[] {
  if (!raw || Array.isArray(raw)) return []

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFilterClause)
  } catch {
    return []
  }
}

export function serializeFiltersParam(clauses: FilterClause[]): string {
  return encodeURIComponent(JSON.stringify(clauses))
}

export function filtersSearchParam(clauses: FilterClause[]): Record<string, string> {
  if (!clauses.length) return {}
  return { [FILTERS_PARAM]: serializeFiltersParam(clauses) }
}

function isFilterClause(value: unknown): value is FilterClause {
  if (!value || typeof value !== 'object') return false
  const clause = value as FilterClause
  return (
    typeof clause.id === 'string' &&
    typeof clause.field === 'string' &&
    typeof clause.operator === 'string'
  )
}

function resolveRelativeDate(preset: string): { from: string; to: string } {
  const now = new Date()
  const to = formatDate(now)

  switch (preset) {
    case 'last_7_days': {
      const from = new Date(now)
      from.setDate(from.getDate() - 7)
      return { from: formatDate(from), to }
    }
    case 'last_30_days': {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { from: formatDate(from), to }
    }
    case 'last_90_days': {
      const from = new Date(now)
      from.setDate(from.getDate() - 90)
      return { from: formatDate(from), to }
    }
    case 'this_month':
      return {
        from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        to,
      }
    default:
      return { from: preset, to: preset }
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function normalizeListValue(value: string | string[] | boolean | undefined): string[] {
  if (value === undefined || typeof value === 'boolean') return []
  if (Array.isArray(value)) return value.filter((v) => v.length > 0)
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Map one field condition to a Payload `where` fragment (no join-field prefix handling). */
export function fieldConditionToWhere(
  field: string,
  operator: FilterOperator,
  value?: string | string[] | boolean,
): Where | null {
  if (operator === 'relative' && typeof value === 'string') {
    const { from, to } = resolveRelativeDate(value)
    return {
      and: [
        { [field]: { greater_than_equal: dateRangeStartBound(from) } },
        { [field]: { less_than_equal: dateRangeEndBound(to) } },
      ],
    }
  }

  if (operator === 'between' && typeof value === 'string') {
    const [from, to] = value.split('..')
    if (!from || !to) return null
    return {
      and: [
        { [field]: { greater_than_equal: dateRangeStartBound(from) } },
        { [field]: { less_than_equal: dateRangeEndBound(to) } },
      ],
    }
  }

  if (operator === 'exists') {
    return { [field]: { exists: Boolean(value) } }
  }

  if (operator === 'in' || operator === 'not_in') {
    const list = normalizeListValue(value)
    if (!list.length) return null
    return { [field]: { [operator]: list } }
  }

  if (value === undefined) return null

  const scalar = Array.isArray(value) ? value[0] : value
  if (scalar === undefined || scalar === '') return null

  if (operator === 'greater_than_equal') {
    return { [field]: { greater_than_equal: dateQueryBound(scalar, 'start') } }
  }

  if (operator === 'less_than_equal') {
    return { [field]: { less_than_equal: dateQueryBound(scalar, 'end') } }
  }

  if (operator === 'greater_than') {
    return { [field]: { greater_than: dateQueryBound(scalar, 'end') } }
  }

  if (operator === 'less_than') {
    return { [field]: { less_than: dateRangeStartBound(scalar) } }
  }

  return { [field]: { [operator]: scalar } }
}

export function clauseToWhere(clause: FilterClause): Where | null {
  if (clause.field.startsWith('entries.')) {
    return null
  }

  return fieldConditionToWhere(clause.field, clause.operator, clause.value)
}

/**
 * Combine clauses with per-row And/Or — mirrors Payload `and` / `or` groups.
 *
 * @example (A or B) and C — row0 A, row1 logic=or B, row2 logic=and C
 */
export function buildWhereFromClauses(clauses: FilterClause[]): Where | null {
  const pairs = clauses
    .map((clause) => ({ clause, where: clauseToWhere(clause) }))
    .filter((pair): pair is { clause: FilterClause; where: Where } => pair.where !== null)

  if (!pairs.length) return null

  const first = pairs[0]!
  if (pairs.length === 1) return first.where

  const segments: Where[] = []
  let orGroup: Where[] = [first.where]

  for (let i = 1; i < pairs.length; i++) {
    const { clause, where } = pairs[i]!
    const logic: FilterLogic = clause.logic ?? 'and'

    if (logic === 'or') {
      orGroup.push(where)
      continue
    }

    segments.push(orGroup.length === 1 ? orGroup[0]! : { or: orGroup })
    orGroup = [where]
  }

  segments.push(orGroup.length === 1 ? orGroup[0]! : { or: orGroup })

  if (segments.length === 1) return segments[0]!
  return { and: segments }
}

/** @deprecated Prefer {@link buildWhereFromClauses} — kept for simple callers. */
export function buildHeaderWhere(clauses: FilterClause[]): Where[] {
  const combined = buildWhereFromClauses(clauses)
  return combined ? [combined] : []
}

export function splitEntryClauses(clauses: FilterClause[]): {
  headerClauses: FilterClause[]
  entryClauses: FilterClause[]
} {
  const headerClauses: FilterClause[] = []
  const entryClauses: FilterClause[] = []

  for (const clause of clauses) {
    if (clause.field.startsWith('entries.')) {
      entryClauses.push(clause)
    } else {
      headerClauses.push(clause)
    }
  }

  return { headerClauses, entryClauses }
}

export function newFilterId(): string {
  return crypto.randomUUID()
}

/** Operators that exclude matches on join collections (negation semantics). */
export function isExcludingEntryOperator(clause: FilterClause): boolean {
  if (clause.operator === 'not_equals' || clause.operator === 'not_in') return true
  if (clause.operator === 'exists' && clause.value === false) return true
  return false
}
