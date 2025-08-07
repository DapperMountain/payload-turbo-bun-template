import { AccessResult, PayloadRequest } from 'payload'

/**
 * Wraps a Payload access function and ensures that it returns a boolean or a Promise<boolean>.
 * This is useful for access functions that may return a `Where` clause or similar object,
 * treating those as equivalent to `true` (i.e., granting access).
 *
 * @param accessFn - The access function to wrap.
 * @returns A new access function that always returns a boolean or a Promise<boolean>.
 */
export const boolean =
  (
    accessFn: ({ req }: { req: PayloadRequest }) => AccessResult | Promise<AccessResult>,
  ): (({ req }: { req: PayloadRequest }) => Promise<boolean>) =>
  async ({ req }: { req: PayloadRequest }): Promise<boolean> => {
    const result = await accessFn({ req })

    // If the result is an object (e.g., a Where clause), treat it as true
    if (typeof result === 'object' && result !== null) return true

    // Otherwise, coerce the result to a boolean
    return !!result
  }
