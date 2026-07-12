import { isFilter } from './isFilter'
import { isPromise } from './isPromise'
import type { Access, AccessArgs, AccessResult, Where } from 'payload'

/**
 * Evaluates multiple access functions and normalizes sync/async results.
 *
 * @param funcs - Access functions to run with the same args.
 * @param args - Payload access arguments passed to each function.
 * @returns Resolved boolean or `Where` results in order.
 */
export const evaluateAccessResults = async (
  funcs: Access[],
  args: AccessArgs,
): Promise<(boolean | Where)[]> =>
  Promise.all(
    funcs.map(async (func) => {
      const result = func(args)
      return isPromise(result) ? await result : result
    }),
  )

/**
 * Merges `Where` clauses from access results.
 *
 * @param results - Outcomes from {@link evaluateAccessResults}.
 * @param logic - `and` or `or` when multiple filters are present.
 * @returns A single filter, `true` when no filters apply, or `false` from callers.
 */
export const combineAccessResults = (
  results: AccessResult[],
  logic: 'and' | 'or',
): AccessResult => {
  const filters = results.filter(isFilter)

  if (filters.length === 0) {
    return true
  }

  if (filters.length === 1) {
    return filters[0] as AccessResult
  }

  return { [logic]: filters }
}
