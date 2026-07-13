import 'server-only'

import type { Payload, Where } from 'payload'

import {
  buildWhereFromClauses,
  fieldConditionToWhere,
  isExcludingEntryOperator,
  splitEntryClauses,
} from '@/lib/filters/parse'
import type { FilterClause } from '@/lib/filters/types'
import type { Transaction, User } from '@/types'
import { getCollectionId } from '@/utils'

async function transactionIdsForEntryClauses(
  payload: Payload,
  user: User,
  workspaceId: string,
  entryClauses: FilterClause[],
): Promise<Where[]> {
  const filters: Where[] = []

  for (const clause of entryClauses) {
    const entryField = clause.field.replace(/^entries\./, '')
    const condition = fieldConditionToWhere(entryField, clause.operator, clause.value)

    if (!condition) continue

    const entryWhere: Where = {
      and: [{ workspace: { equals: workspaceId } }, condition],
    }

    const entries = await payload.find({
      collection: 'transaction-entries',
      where: entryWhere,
      limit: 500,
      depth: 0,
      user,
      overrideAccess: false,
      pagination: false,
    })

    const txIds = [
      ...new Set(
        entries.docs
          .map((entry) => getCollectionId(entry.transaction))
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    if (isExcludingEntryOperator(clause)) {
      filters.push(txIds.length ? { id: { not_in: txIds } } : {})
    } else {
      filters.push({
        id: { in: txIds.length ? txIds : ['00000000-0000-7000-8000-000000000000'] },
      })
    }
  }

  return filters
}

export async function findFilteredTransactions(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    clauses: FilterClause[]
    sort?: string
    limit?: number
    page?: number
  },
): Promise<{ docs: Transaction[]; totalDocs: number; hasNextPage: boolean }> {
  const { headerClauses, entryClauses } = splitEntryClauses(options.clauses)
  const entryFilters = await transactionIdsForEntryClauses(
    payload,
    options.user,
    options.workspaceId,
    entryClauses,
  )

  const headerWhere = buildWhereFromClauses(headerClauses)
  const andParts: Where[] = [{ workspace: { equals: options.workspaceId } }]

  if (headerWhere) andParts.push(headerWhere)
  andParts.push(...entryFilters.filter((f) => Object.keys(f).length > 0))

  const where: Where =
    andParts.length === 1 ? andParts[0]! : { and: andParts }

  const result = await payload.find({
    collection: 'transactions',
    where,
    depth: 3,
    sort: options.sort ?? '-date',
    limit: options.limit ?? 50,
    page: options.page ?? 1,
    user: options.user,
    overrideAccess: false,
  })

  return {
    docs: result.docs,
    totalDocs: result.totalDocs,
    hasNextPage: result.hasNextPage,
  }
}

export async function findFilteredAccounts(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    clauses: FilterClause[]
    sort?: string
    limit?: number
  },
) {
  const filterWhere = buildWhereFromClauses(options.clauses)
  const andParts: Where[] = [{ workspace: { equals: options.workspaceId } }]

  if (filterWhere) andParts.push(filterWhere)

  const where: Where =
    andParts.length === 1 ? andParts[0]! : { and: andParts }

  return payload.find({
    collection: 'accounts',
    where,
    depth: 1,
    sort: options.sort ?? 'name',
    limit: options.limit ?? 100,
    user: options.user,
    overrideAccess: false,
  })
}
