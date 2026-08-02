import type { Payload, PayloadRequest, User } from 'payload'

import { getCollectionId } from '@/utils/getCollectionId'

import {
  buildMatchMergePatch,
  resolveMatchPair,
  type MatchCandidate,
} from './matchTransactions'

export type MatchAndMergeResult = {
  keptId: string
  deletedId: string
}

type MatchAndMergeArgs = {
  payload: Payload
  user: User
  ids: [string, string]
  req?: PayloadRequest
  overrideAccess?: boolean
}

async function loadCandidate(
  args: MatchAndMergeArgs,
  id: string,
): Promise<MatchCandidate> {
  return args.payload.findByID({
    collection: 'transactions',
    id,
    depth: 2,
    user: args.user,
    overrideAccess: args.overrideAccess ?? false,
    req: args.req,
  })
}

/**
 * Merge a manual ↔ imported pair: keep the manual row (plus import identity),
 * delete the absorbed import row. API-first entry point for REST + Local API.
 */
export async function matchAndMergeTransactions(
  args: MatchAndMergeArgs,
): Promise<MatchAndMergeResult> {
  const [firstId, secondId] = args.ids
  const first = await loadCandidate(args, firstId)
  const second = await loadCandidate(args, secondId)

  const { keep, absorb } = resolveMatchPair(first, second)
  const patch = buildMatchMergePatch(keep, absorb)

  // Clear absorb import keys first so unique (workspace, externalId) can move to keep.
  await args.payload.update({
    collection: 'transactions',
    id: absorb.id,
    data: {
      externalId: null,
      importBatch: null,
    },
    user: args.user,
    overrideAccess: args.overrideAccess ?? false,
    req: args.req,
    depth: 0,
  })

  await args.payload.update({
    collection: 'transactions',
    id: keep.id,
    data: {
      date: patch.date,
      payee: patch.payee,
      source: patch.source,
      externalId: patch.externalId,
      importBatch: patch.importBatch,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.entries ? { entries: patch.entries } : {}),
    },
    user: args.user,
    overrideAccess: args.overrideAccess ?? false,
    req: args.req,
    depth: 0,
  })

  await args.payload.delete({
    collection: 'transactions',
    id: absorb.id,
    user: args.user,
    overrideAccess: args.overrideAccess ?? false,
    req: args.req,
  })

  return {
    keptId: keep.id,
    deletedId: absorb.id,
  }
}

export function pairMatchIds(ids: string[]): [string, string] {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (unique.length !== 2) {
    throw new Error('Match requires exactly two transactions')
  }
  return [unique[0], unique[1]]
}
