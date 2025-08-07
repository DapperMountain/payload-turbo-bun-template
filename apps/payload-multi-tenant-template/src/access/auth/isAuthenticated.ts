import { Access, PayloadRequest } from 'payload'

/**
 * Checks if the user is authenticated based on the presence of a user object on the request.
 */
const isAuthenticated: Access = async ({ req }: { req: PayloadRequest }): Promise<boolean> => Boolean(req?.user)

export default isAuthenticated
