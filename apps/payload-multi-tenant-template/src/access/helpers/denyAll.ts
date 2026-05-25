import type { Access } from 'payload'

/** Denies all requests. Useful for locked collections or disabled operations. */
export const denyAll: Access = () => false
