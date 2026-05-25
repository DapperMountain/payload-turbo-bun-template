import { withAuth } from '@/access/helpers'
import type { Access, PayloadRequest } from 'payload'

/**
 * Row-level access for documents created by the current user.
 *
 * Enable Payload's `createdBy` field (or a custom author field) on the collection first.
 *
 * @param authorField - Field storing the creator's user id (default `createdBy`).
 */
export const isCreatedByScope =
  (authorField = 'createdBy'): Access =>
  withAuth(({ req }: { req: PayloadRequest }) => ({
    [authorField]: {
      equals: req.user?.id,
    },
  }))

/** {@link isCreatedByScope} with default `createdBy`. */
export const isCreatedBy = isCreatedByScope()
