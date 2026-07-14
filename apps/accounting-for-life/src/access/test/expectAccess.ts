import { expect } from 'bun:test'

import type { User } from '@/types'
import type { AccessArgs, AccessResult } from 'payload'

import { accessArgs } from './accessArgs'

type AccessFn = (args: AccessArgs) => AccessResult | Promise<AccessResult>

/**
 * Asserts an access function resolves to the expected result for a given user.
 *
 * @param overrides - Extra AccessArgs (e.g. `{ data: { deletedAt: '...' } }` for trash).
 */
export const expectAccess = async (
  accessFn: AccessFn,
  user: User | null,
  expected: AccessResult,
  overrides?: Partial<AccessArgs>,
): Promise<void> => {
  await expect(accessFn(accessArgs(user, overrides))).resolves.toEqual(expected)
}
