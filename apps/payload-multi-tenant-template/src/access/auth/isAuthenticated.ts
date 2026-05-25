import type { Access, PayloadRequest } from 'payload'

/**
 * Returns whether the request has an authenticated user (`req.user` is set).
 */
export const isAuthenticated: Access = async ({ req }: { req: PayloadRequest }): Promise<boolean> =>
  Boolean(req.user)
