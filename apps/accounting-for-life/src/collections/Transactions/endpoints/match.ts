import type { Endpoint, PayloadRequest } from 'payload'

import {
  matchAndMergeTransactions,
  pairMatchIds,
} from '@/collections/Transactions/lib/matchAndMergeTransactions'

/**
 * POST /api/transactions/match
 * Body: `{ ids: [manualOrImportId, otherId] }`
 *
 * Keeps the manual row, absorbs import identity, deletes the import row (US-6.1).
 */
export const matchTransactionsEndpoint: Endpoint = {
  path: '/match',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) {
      return Response.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ errors: [{ message: 'Invalid JSON body' }] }, { status: 400 })
    }

    const idsRaw =
      body && typeof body === 'object' && 'ids' in body
        ? (body as { ids?: unknown }).ids
        : undefined

    if (!Array.isArray(idsRaw)) {
      return Response.json(
        { errors: [{ message: 'Body must include ids: [id, id]' }] },
        { status: 400 },
      )
    }

    try {
      const ids = pairMatchIds(idsRaw.map(String))
      const result = await matchAndMergeTransactions({
        payload: req.payload,
        user: req.user,
        ids,
        req,
        overrideAccess: false,
      })
      return Response.json(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Match failed'
      return Response.json({ errors: [{ message }] }, { status: 400 })
    }
  },
}
