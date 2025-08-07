import { combineAccessResults, evaluateAccessResults } from '@/access/helpers/accessResults'
import { Access, AccessArgs, AccessResult } from 'payload'

/**
 * Requires all access functions to return `true` or valid filters (`Where` clauses).
 * If any function denies access (`false`), access is denied.
 * If the user is a system admin, access is granted immediately.
 * Combines filters using `and` logic.
 */
export const requireAll =
  <T = unknown>(...accessFns: Access<T>[]): Access<T> =>
  async (args: AccessArgs<T>): Promise<AccessResult> => {
    // Evaluate all other access functions
    const results = await evaluateAccessResults(accessFns, args)

    // If any result is `false`, deny access immediately
    if (results.includes(false)) {
      return false
    }

    // Combine the filters (`Where` clauses) using `and` logic
    return combineAccessResults(results, 'and')
  }
