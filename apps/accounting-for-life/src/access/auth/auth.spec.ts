import { describe, expect, it } from 'bun:test'

import { accessArgs, tenantMemberUser } from '@/access/test'

import { isAuthenticated } from './isAuthenticated'

describe('isAuthenticated', () => {
  const access = isAuthenticated

  it('returns true when req.user is set', async () => {
    await expect(access(accessArgs(tenantMemberUser))).resolves.toBe(true)
  })

  it('returns false when req.user is missing', async () => {
    await expect(access(accessArgs(null))).resolves.toBe(false)
  })
})
