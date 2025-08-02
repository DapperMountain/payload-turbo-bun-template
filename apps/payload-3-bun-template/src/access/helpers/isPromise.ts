import { Where } from 'payload'

/**
 * Checks if a given value is a promise.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a promise, `false` otherwise.
 */
export const isPromise = (value: unknown): value is Promise<boolean | Where> =>
  typeof value === 'object' && value !== null && 'then' in value
