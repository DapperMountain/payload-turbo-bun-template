import { combineAccessResults, evaluateAccessResults } from './accessResults'
import type { Access, AccessArgs, AccessResult } from 'payload'

/**
 * Composes access functions with logical **AND**.
 *
 * - If any function returns `false`, the result is `false`.
 * - Otherwise combines `Where` clauses with `and`, or returns `true` when there are no filters.
 *
 * Does not apply a system-admin bypass; use {@link withAuth} on individual checks when needed.
 *
 * @param accessFns - Access functions to evaluate.
 * @returns A composed `Access` function.
 */
export const requireAll =
  <T = unknown>(...accessFns: Access<T>[]): Access<T> =>
  async (args: AccessArgs<T>): Promise<AccessResult> => {
    const results = await evaluateAccessResults(accessFns, args)

    if (results.includes(false)) {
      return false
    }

    return combineAccessResults(results, 'and')
  }
