import { describe, expect, it } from 'bun:test'

import { transactionEntriesAccess } from '@/access/collections'
import {
  accessArgs,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const memberEntryScope = {
  and: [
    { 'account.budget': { in: ['budget-a'] } },
    {
      or: [
        { 'account.visibility': { equals: 'all_members' } },
        { 'account.visibility': { exists: false } },
      ],
    },
  ],
}

const adminEntryScope = {
  or: [
    memberEntryScope,
    {
      and: [
        { 'account.budget': { in: ['budget-a'] } },
        { 'account.visibility': { equals: 'admins' } },
      ],
    },
  ],
}

describe('transactionEntriesAccess', () => {
  describe('read', () => {
    const read = transactionEntriesAccess.read!

    it('allows system admins full access', async () => {
      await expect(read(accessArgs(systemAdminUser))).resolves.toBe(true)
    })

    it('scopes members to entries on all_members accounts', async () => {
      await expect(read(accessArgs(workspaceMemberUser))).resolves.toEqual(memberEntryScope)
    })

    it('includes admins-only account entries for budget admins', async () => {
      await expect(read(accessArgs(workspaceAdminUser))).resolves.toEqual(adminEntryScope)
    })
  })

  describe.each(['create', 'update', 'delete'] as const)('%s', (operation) => {
    const access = transactionEntriesAccess[operation]!

    it('denies direct writes for everyone', () => {
      expect(access(accessArgs(systemAdminUser))).toBe(false)
      expect(access(accessArgs(workspaceMemberUser))).toBe(false)
    })
  })
})
