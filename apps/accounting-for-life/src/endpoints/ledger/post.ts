import type { Endpoint, PayloadRequest } from 'payload'

import { postJournalEntry } from '@/ledger'
import type { PostJournalEntryInput } from '@/ledger'
import { isAppUser } from '@/utils'

/**
 * Posts a balanced journal entry and its lines in one transaction.
 *
 * Journal lines cannot be created through the REST API directly.
 */
const ledgerPost: Endpoint = {
  path: '/ledger/post',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user

    if (!isAppUser(user)) {
      return Response.json({ errors: [{ message: 'Unauthorized' }] }, { status: 401 })
    }

    let body: PostJournalEntryInput

    try {
      body = (await req.json?.()) as PostJournalEntryInput
    } catch {
      return Response.json({ errors: [{ message: 'Invalid JSON body' }] }, { status: 400 })
    }

    if (!body?.workspace || !body?.budget || !body?.date || !body?.type || !body?.lines?.length) {
      return Response.json(
        { errors: [{ message: 'workspace, budget, date, type, and lines are required' }] },
        { status: 400 },
      )
    }

    try {
      const entry = await postJournalEntry({
        payload: req.payload,
        user,
        input: body,
        req,
      })

      return Response.json({ doc: entry })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to post journal entry'

      return Response.json({ errors: [{ message }] }, { status: 400 })
    }
  },
}

export default ledgerPost
