import 'server-only'

import type { Payload, Where } from 'payload'

import { buildWhereFromClauses } from '@/lib/filters/parse'
import type { FilterClause } from '@/lib/filters/types'
import type { Budget, User } from '@/types'

export async function findFilteredBudgets(
  payload: Payload,
  options: {
    user: User
    workspaceId: string
    clauses: FilterClause[]
    sort?: string
    limit?: number
  },
): Promise<{ docs: Budget[]; totalDocs: number }> {
  const filterWhere = buildWhereFromClauses(options.clauses)
  const andParts: Where[] = [{ workspace: { equals: options.workspaceId } }]

  if (filterWhere) andParts.push(filterWhere)

  const where: Where = andParts.length === 1 ? andParts[0]! : { and: andParts }

  return payload.find({
    collection: 'budgets',
    where,
    depth: 0,
    sort: options.sort ?? 'name',
    limit: options.limit ?? 50,
    user: options.user,
    overrideAccess: false,
  })
}
