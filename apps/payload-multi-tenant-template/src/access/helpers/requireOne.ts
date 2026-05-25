import { combineAccessResults, evaluateAccessResults } from './accessResults'
import type { Access, AccessArgs, AccessResult } from 'payload'

/**
 * Composes access functions with logical **OR**.
 *
 * - If any function returns `true`, the result is `true`.
 * - Otherwise combines `Where` clauses with `or`, or returns `false` when nothing matches.
 *
 * Does not apply a system-admin bypass; pair with {@link isSystemAdmin} when admins need full access.
 *
 * @param accessFns - Access functions to evaluate.
 * @returns A composed `Access` function.
 */
export const requireOne =
  <T = unknown>(...accessFns: Access<T>[]): Access<T> =>
  async (args: AccessArgs<T>): Promise<AccessResult> => {
    const results = await evaluateAccessResults(accessFns, args)

    if (results.includes(true)) {
      return true
    }

    if (results.every((result) => result === false)) {
      return false
    }

    return combineAccessResults(results, 'or')
  }
