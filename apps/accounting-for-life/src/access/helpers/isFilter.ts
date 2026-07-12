import type { Where } from 'payload'

/**
 * Type guard: value is a Payload `Where` constraint (not a bare boolean).
 *
 * @param value - Access result to narrow.
 */
export const isFilter = (value: boolean | Where): value is Where => typeof value !== 'boolean'
