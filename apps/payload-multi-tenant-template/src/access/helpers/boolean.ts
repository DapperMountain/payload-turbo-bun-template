import type { AccessResult, PayloadRequest } from 'payload'

/**
 * Coerces an access function to a strict boolean result.
 *
 * Treats any object result (e.g. a `Where` clause) as `true`. Prefer a dedicated
 * boolean-only access function for `admin` collection visibility when possible.
 *
 * @param accessFn - Access function that may return `Where` or boolean.
 * @returns Access function that always resolves to boolean.
 */
export const boolean =
  (
    accessFn: ({ req }: { req: PayloadRequest }) => AccessResult | Promise<AccessResult>,
  ): (({ req }: { req: PayloadRequest }) => Promise<boolean>) =>
  async ({ req }: { req: PayloadRequest }): Promise<boolean> => {
    const result = await accessFn({ req })

    if (typeof result === 'object' && result !== null) {
      return true
    }

    return Boolean(result)
  }
