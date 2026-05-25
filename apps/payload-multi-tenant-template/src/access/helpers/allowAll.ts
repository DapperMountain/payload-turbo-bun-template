import type { Access } from 'payload'

/**
 * Allows all requests (including unauthenticated). Use sparingly — e.g. public globals
 * combined with field-level restrictions, or temporary scaffolding.
 */
export const allowAll: Access = () => true
