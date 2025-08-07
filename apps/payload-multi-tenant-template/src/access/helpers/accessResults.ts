import { isFilter } from '@/access/helpers/isFilter'
import { isPromise } from '@/access/helpers/isPromise'
import { Access, AccessArgs, AccessResult, Where } from 'payload'

/**
 * Evaluates an array of access functions and returns their results as a promise.
 * Handles both synchronous and asynchronous access functions, ensuring all results are resolved.
 *
 * @param funcs - The access functions to evaluate.
 * @param args - The arguments to pass to each access function.
 * @returns A promise that resolves to an array of access results (boolean or Where clause).
 */
export const evaluateAccessResults = async (funcs: Access[], args: AccessArgs): Promise<(boolean | Where)[]> =>
  Promise.all(
    funcs.map(async (func) => {
      const result = func(args)
      return isPromise(result) ? await result : result
    }),
  )

/**
 * Combines the `Where` clauses (filters) from access function results.
 * Handles multiple filters based on the provided logic (`and` or `or`).
 *
 * @param results - The results of the evaluated access functions.
 * @param logic - The logic to combine multiple `Where` clauses (`and` or `or`).
 * @returns The combined filters or `true` if there are no filters to combine.
 */
export const combineAccessResults = (results: AccessResult[], logic: 'and' | 'or'): AccessResult => {
  // Gather filters (e.g., `Where` clauses) from the results
  const filters = results.filter(isFilter)

  // If no filters exist, return `true` (default access)
  if (filters.length === 0) return true

  // If only one filter exists, return that filter
  if (filters.length === 1) return filters[0] as AccessResult

  // Combine multiple filters using the specified logic (`and` or `or`)
  return { [logic]: filters }
}
