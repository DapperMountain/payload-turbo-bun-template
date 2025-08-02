import { Where } from 'payload'

/**
 * Checks if a given value is a `Where` filter clause.
 *
 * @param value - The value to check.
 * @returns `true` if the value is a `Where` clause, `false` if it is a boolean.
 */
export const isFilter = (value: boolean | Where): value is Where => typeof value !== 'boolean'
