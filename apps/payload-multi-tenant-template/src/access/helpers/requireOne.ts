import { combineAccessResults, evaluateAccessResults } from '@/access/helpers/accessResults'
import { Access, AccessArgs, AccessResult } from 'payload'

/**
 * Requires at least one access function to return `true` or valid filters (`Where` clauses).
 * If no function grants access, access is denied.
 * If the user is a system admin, access is granted immediately.
 * Combines filters using `or` logic.
 */
export const requireOne =
  <T = unknown>(...accessFns: Access<T>[]): Access<T> =>
  async (args: AccessArgs<T>): Promise<AccessResult> => {
    // Evaluate all other access functions
    const results = await evaluateAccessResults(accessFns, args)

    // If any result is `true`, grant access immediately
    if (results.includes(true)) {
      return true
    }

    // Combine the filters (`Where` clauses) using `or` logic
    return combineAccessResults(results, 'or')
  }
