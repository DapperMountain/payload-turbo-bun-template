import { requireOne } from '@/access/helpers'

import { isSelf } from './isSelf'
import { isSystemAdmin } from './isSystemAdmin'

/**
 * System administrators see all rows; other users only their own (`id` equals `req.user.id`).
 *
 * Common alternative to strict self-only maps on the `users` collection.
 */
export const isAdminOrSelf = requireOne(isSystemAdmin, isSelf)
