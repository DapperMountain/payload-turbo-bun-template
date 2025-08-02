import { withAuth } from '@/access/helpers'
import { Access, PayloadRequest } from 'payload'

/**
 * Checks if the user is requesting their own record based on authentication and comparing the requested ID to the
 * authenticated user's ID. Returns false if user is not authenticated.
 */
const isSelf: Access = withAuth(({ req }: { req: PayloadRequest }) => ({
  id: {
    equals: req?.user?.id,
  },
}))

export default isSelf
