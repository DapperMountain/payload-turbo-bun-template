import { describe, expect, it } from 'bun:test'

import type { User } from '@/types'
import type { AccessArgs, AccessResult } from 'payload'

import { usersAccess } from '@/access/collections'
import { accessArgs, expectAccess, systemAdminUser, tenantMemberUser } from '@/access/test'

type AccessCase = [label: string, user: User | null, allowed: boolean]

const systemAdminOnlyCases: AccessCase[] = [
  ['system admin', systemAdminUser, true],
  ['tenant member', tenantMemberUser, false],
  ['unauthenticated', null, false],
]

const adminPanelCases: AccessCase[] = [
  ['system admin', systemAdminUser, true],
  ['tenant member', tenantMemberUser, false],
]

const adminOnlyOperations = ['create', 'delete', 'unlock'] as const

type AdminOnlyOperation = (typeof adminOnlyOperations)[number]

type AccessFn = (args: AccessArgs) => AccessResult | Promise<AccessResult>

type AdminAccessFn = (args: AccessArgs) => boolean

const runSystemAdminOnlyCases = (access: AccessFn, cases: AccessCase[]): void => {
  for (const [label, user, allowed] of cases) {
    it(label, async () => {
      await expectAccess(access, user, allowed)
    })
  }
}

describe('usersAccess', () => {
  describe('read', () => {
    const read = usersAccess.read as AccessFn

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes non-admins to their own user id', async () => {
      await expectAccess(read, tenantMemberUser, { id: { equals: tenantMemberUser.id } })
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(read, null, false)
    })
  })

  describe('update', () => {
    const update = usersAccess.update as AccessFn

    it('allows system admins full access', async () => {
      await expectAccess(update, systemAdminUser, true)
    })

    it('scopes non-admins to their own user id', async () => {
      await expectAccess(update, tenantMemberUser, { id: { equals: tenantMemberUser.id } })
    })

    it('denies unauthenticated requests', async () => {
      await expectAccess(update, null, false)
    })
  })

  for (const operation of adminOnlyOperations) {
    describe(operation, () => {
      const access = usersAccess[operation] as AccessFn

      runSystemAdminOnlyCases(access, systemAdminOnlyCases)
    })
  }

  describe('admin', () => {
    const admin = usersAccess.admin as AdminAccessFn

    for (const [label, user, visible] of adminPanelCases) {
      it(label, () => {
        expect(admin(accessArgs(user))).toBe(visible)
      })
    }
  })
})
