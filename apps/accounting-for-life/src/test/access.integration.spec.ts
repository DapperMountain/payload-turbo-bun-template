import { beforeAll, describe, expect, it } from 'bun:test'

import type { User } from '@/types'
import {
  expectAccessDenied,
  loginAs,
  payload,
  seedAccessFixtures,
  type AccessFixtures,
} from '@/test'

describe('collection access integration', () => {
  let fx: AccessFixtures
  let systemAdmin: User
  let workspaceAAdmin: User
  let workspaceAMember: User
  let workspaceBMember: User
  let outsider: User

  beforeAll(async () => {
    fx = await seedAccessFixtures(payload)
    systemAdmin = await loginAs(payload, fx.emails.systemAdmin)
    workspaceAAdmin = await loginAs(payload, fx.emails.workspaceAAdmin)
    workspaceAMember = await loginAs(payload, fx.emails.workspaceAMember)
    workspaceBMember = await loginAs(payload, fx.emails.workspaceBMember)
    outsider = await loginAs(payload, fx.emails.outsider)
  })

  describe('workspaces', () => {
    it('system admin reads all workspaces', async () => {
      const all = await payload.find({
        collection: 'workspaces',
        user: systemAdmin,
        overrideAccess: false,
        pagination: false,
      })

      expect(all.totalDocs).toBeGreaterThanOrEqual(2)
      expect(all.docs.some((doc) => doc.id === fx.workspaceA.id)).toBe(true)
      expect(all.docs.some((doc) => doc.id === fx.workspaceB.id)).toBe(true)
    })

    it('workspace member is scoped to their workspace', async () => {
      const memberView = await payload.find({
        collection: 'workspaces',
        user: workspaceAMember,
        overrideAccess: false,
        pagination: false,
      })

      expect(memberView.totalDocs).toBe(1)
      expect(memberView.docs[0]?.id).toBe(fx.workspaceA.id)
    })

    it('outsider cannot list workspaces', async () => {
      await expectAccessDenied(() =>
        payload.find({
          collection: 'workspaces',
          user: outsider,
          overrideAccess: false,
          pagination: false,
        }),
      )
    })

    it('workspace admin can update their workspace', async () => {
      const updated = await payload.update({
        collection: 'workspaces',
        id: fx.workspaceA.id,
        user: workspaceAAdmin,
        overrideAccess: false,
        data: { description: 'Updated by workspace A admin' },
      })

      expect(updated.description).toBe('Updated by workspace A admin')
    })

    it('workspace member cannot update or create workspaces', async () => {
      await expectAccessDenied(() =>
        payload.update({
          collection: 'workspaces',
          id: fx.workspaceA.id,
          user: workspaceAMember,
          overrideAccess: false,
          data: { description: 'Denied' },
        }),
      )

      await expectAccessDenied(() =>
        payload.create({
          collection: 'workspaces',
          user: workspaceAAdmin,
          overrideAccess: false,
          data: {
            name: 'Forbidden',
            description: 'Denied',
            domain: 'denied.example.com',
          },
        }),
      )
    })
  })

  describe('budgets', () => {
    it('system admin sees budgets in both workspaces', async () => {
      const adminView = await payload.find({
        collection: 'budgets',
        user: systemAdmin,
        overrideAccess: false,
        pagination: false,
      })

      expect(adminView.docs.some((doc) => doc.id === fx.budgetA.id)).toBe(true)
      expect(adminView.docs.some((doc) => doc.id === fx.budgetB.id)).toBe(true)
    })

    it('workspace members only see budgets in their workspace', async () => {
      const memberA = await payload.find({
        collection: 'budgets',
        user: workspaceAMember,
        overrideAccess: false,
        pagination: false,
      })

      expect(memberA.totalDocs).toBeGreaterThanOrEqual(1)
      expect(memberA.docs.every((doc) => doc.id !== fx.budgetB.id)).toBe(true)

      const memberB = await payload.find({
        collection: 'budgets',
        user: workspaceBMember,
        overrideAccess: false,
        pagination: false,
      })

      expect(memberB.totalDocs).toBe(1)
      expect(memberB.docs[0]?.id).toBe(fx.budgetB.id)
    })

    it('workspace admin can create budgets; member cannot', async () => {
      await payload.create({
        collection: 'budgets',
        user: workspaceAAdmin,
        overrideAccess: false,
        context: { skipCategorySeed: true },
        data: {
          name: 'Side Project',
          isDefault: false,
          workspace: fx.workspaceA.id,
        },
      })

      await expectAccessDenied(() =>
        payload.create({
          collection: 'budgets',
          user: workspaceAMember,
          overrideAccess: false,
          context: { skipCategorySeed: true },
          data: {
            name: 'Denied Budget',
            isDefault: false,
            workspace: fx.workspaceA.id,
          },
        }),
      )
    })

    it('budget admin can update budgets; hard delete stays system-admin-only', async () => {
      const updated = await payload.update({
        collection: 'budgets',
        id: fx.budgetA.id,
        user: workspaceAAdmin,
        overrideAccess: false,
        data: { name: 'Budget A Updated' },
      })

      expect(updated.name).toBe('Budget A Updated')

      await expectAccessDenied(() =>
        payload.delete({
          collection: 'budgets',
          id: fx.budgetA.id,
          user: workspaceAAdmin,
          overrideAccess: false,
        }),
      )
    })
  })

  describe('category-groups', () => {
    it('workspace member only sees groups in their workspace', async () => {
      const groupA = await payload.create({
        collection: 'category-groups',
        data: {
          name: 'Access Test Group A',
          kind: 'expense',
          sortOrder: 0,
          budget: fx.budgetA.id,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      const groupB = await payload.create({
        collection: 'category-groups',
        data: {
          name: 'Access Test Group B',
          kind: 'expense',
          sortOrder: 0,
          budget: fx.budgetB.id,
          workspace: fx.workspaceB.id,
        },
        overrideAccess: true,
      })

      const memberView = await payload.find({
        collection: 'category-groups',
        user: workspaceAMember,
        overrideAccess: false,
        pagination: false,
      })

      expect(memberView.docs.some((doc) => doc.id === groupA.id)).toBe(true)
      expect(memberView.docs.some((doc) => doc.id === groupB.id)).toBe(false)
    })

    it('workspace admin can create groups; member cannot', async () => {
      await payload.create({
        collection: 'category-groups',
        user: workspaceAAdmin,
        overrideAccess: false,
        data: {
          name: 'Admin Group',
          kind: 'income',
          sortOrder: 99,
          budget: fx.budgetA.id,
          workspace: fx.workspaceA.id,
        },
      })

      await expectAccessDenied(() =>
        payload.create({
          collection: 'category-groups',
          user: workspaceAMember,
          overrideAccess: false,
          data: {
            name: 'Denied Group',
            kind: 'expense',
            sortOrder: 1,
            budget: fx.budgetA.id,
            workspace: fx.workspaceA.id,
          },
        }),
      )
    })
  })

  describe('categories', () => {
    it('workspace member only sees categories in their workspace', async () => {
      const groupA = await payload.find({
        collection: 'category-groups',
        limit: 1,
        where: { budget: { equals: fx.budgetA.id } },
        overrideAccess: true,
      })
      const groupB = await payload.find({
        collection: 'category-groups',
        limit: 1,
        where: { budget: { equals: fx.budgetB.id } },
        overrideAccess: true,
      })

      const categoryA = await payload.create({
        collection: 'categories',
        data: {
          name: 'Access Test Category A',
          emoji: '🧪',
          purpose: 'spending',
          sortOrder: 0,
          isSystemDefault: false,
          categoryGroup: groupA.docs[0]!.id,
          budget: fx.budgetA.id,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      const categoryB = await payload.create({
        collection: 'categories',
        data: {
          name: 'Access Test Category B',
          emoji: '🧪',
          purpose: 'spending',
          sortOrder: 0,
          isSystemDefault: false,
          categoryGroup: groupB.docs[0]!.id,
          budget: fx.budgetB.id,
          workspace: fx.workspaceB.id,
        },
        overrideAccess: true,
      })

      const memberView = await payload.find({
        collection: 'categories',
        user: workspaceAMember,
        overrideAccess: false,
        pagination: false,
      })

      expect(memberView.docs.some((doc) => doc.id === categoryA.id)).toBe(true)
      expect(memberView.docs.some((doc) => doc.id === categoryB.id)).toBe(false)
    })

    it('member cannot create categories; admin cannot delete', async () => {
      const groupA = await payload.find({
        collection: 'category-groups',
        limit: 1,
        where: { budget: { equals: fx.budgetA.id } },
        overrideAccess: true,
      })

      const categoryA = await payload.create({
        collection: 'categories',
        data: {
          name: 'Access Test Category Delete',
          emoji: '🧪',
          purpose: 'spending',
          sortOrder: 0,
          isSystemDefault: false,
          categoryGroup: groupA.docs[0]!.id,
          budget: fx.budgetA.id,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      await expectAccessDenied(() =>
        payload.create({
          collection: 'categories',
          user: workspaceAMember,
          overrideAccess: false,
          data: {
            name: 'Denied Category',
            emoji: '💸',
            purpose: 'spending',
            sortOrder: 1,
            categoryGroup: groupA.docs[0]!.id,
            budget: fx.budgetA.id,
            workspace: fx.workspaceA.id,
          },
        }),
      )

      await expectAccessDenied(() =>
        payload.delete({
          collection: 'categories',
          id: categoryA.id,
          user: workspaceAMember,
          overrideAccess: false,
        }),
      )

      await payload.delete({
        collection: 'categories',
        id: categoryA.id,
        user: workspaceAAdmin,
        overrideAccess: false,
      })
    })
  })

  describe('units', () => {
    it('workspace member only sees units in their workspace', async () => {
      const unitA = await payload.create({
        collection: 'units',
        data: {
          code: 'USD-A',
          name: 'Dollar A',
          kind: 'fiat',
          decimalPlaces: 2,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      const unitB = await payload.create({
        collection: 'units',
        data: {
          code: 'USD-B',
          name: 'Dollar B',
          kind: 'fiat',
          decimalPlaces: 2,
          workspace: fx.workspaceB.id,
        },
        overrideAccess: true,
      })

      const memberView = await payload.find({
        collection: 'units',
        user: workspaceAMember,
        overrideAccess: false,
        pagination: false,
      })

      expect(memberView.docs.some((doc) => doc.id === unitA.id)).toBe(true)
      expect(memberView.docs.some((doc) => doc.id === unitB.id)).toBe(false)
    })

    it('workspace admin can create units; member cannot', async () => {
      await payload.create({
        collection: 'units',
        user: workspaceAAdmin,
        overrideAccess: false,
        data: {
          code: 'EUR',
          name: 'Euro',
          kind: 'fiat',
          decimalPlaces: 2,
          workspace: fx.workspaceA.id,
        },
      })

      await expectAccessDenied(() =>
        payload.create({
          collection: 'units',
          user: workspaceAMember,
          overrideAccess: false,
          data: {
            code: 'GBP',
            name: 'Pound',
            kind: 'fiat',
            decimalPlaces: 2,
            workspace: fx.workspaceA.id,
          },
        }),
      )
    })
  })

  describe('accounts', () => {
    it('workspace member can create accounts in their workspace', async () => {
      const unit = await payload.create({
        collection: 'units',
        data: {
          code: 'USD-ACC',
          name: 'US Dollar',
          kind: 'fiat',
          decimalPlaces: 2,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      const account = await payload.create({
        collection: 'accounts',
        user: workspaceAMember,
        overrideAccess: false,
        data: {
          name: 'Member Checking',
          classification: 'asset',
          subtype: 'checking',
          unit: unit.id,
          budget: fx.budgetA.id,
          workspace: fx.workspaceA.id,
        },
      })

      expect(account.id).toBeDefined()
    })

    it('member cannot create accounts on a budget they do not belong to', async () => {
      const otherBudget = await payload.create({
        collection: 'budgets',
        data: {
          name: 'Unshared Budget A',
          isDefault: false,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
        context: { skipCategorySeed: true, skipBudgetMembershipGrant: true },
      })

      const unit = await payload.create({
        collection: 'units',
        data: {
          code: 'USD-XBUD',
          name: 'US Dollar',
          kind: 'fiat',
          decimalPlaces: 2,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      await expectAccessDenied(() =>
        payload.create({
          collection: 'accounts',
          user: workspaceAMember,
          overrideAccess: false,
          data: {
            name: 'Cross-budget Denied',
            classification: 'asset',
            subtype: 'checking',
            unit: unit.id,
            budget: otherBudget.id,
            workspace: fx.workspaceA.id,
          },
        }),
      )
    })

    it('outsider cannot create accounts', async () => {
      const unit = await payload.create({
        collection: 'units',
        data: {
          code: 'USD-OUT',
          name: 'US Dollar',
          kind: 'fiat',
          decimalPlaces: 2,
          workspace: fx.workspaceA.id,
        },
        overrideAccess: true,
      })

      await expectAccessDenied(() =>
        payload.create({
          collection: 'accounts',
          user: outsider,
          overrideAccess: false,
          data: {
            name: 'Denied',
            classification: 'asset',
            subtype: 'checking',
            unit: unit.id,
            budget: fx.budgetA.id,
            workspace: fx.workspaceA.id,
          },
        }),
      )
    })
  })

  describe('transaction-entries', () => {
    it('member cannot create transaction entries directly', async () => {
      await expectAccessDenied(() =>
        payload.create({
          collection: 'transaction-entries',
          user: workspaceAMember,
          overrideAccess: false,
          data: {
            workspace: fx.workspaceA.id,
            transaction: '00000000-0000-7000-8000-000000000001',
            account: '00000000-0000-7000-8000-000000000002',
            amount: 10,
            unit: '00000000-0000-7000-8000-000000000003',
          },
        }),
      )
    })
  })

  describe('users', () => {
    it('user can read self but not other users', async () => {
      const self = await payload.findByID({
        collection: 'users',
        id: workspaceAMember.id,
        user: workspaceAMember,
        overrideAccess: false,
      })

      expect(self.id).toBe(workspaceAMember.id)

      await expectAccessDenied(() =>
        payload.findByID({
          collection: 'users',
          id: systemAdmin.id,
          user: workspaceAMember,
          overrideAccess: false,
        }),
      )
    })

    it('system admin can read any user; member cannot create users', async () => {
      const other = await payload.findByID({
        collection: 'users',
        id: workspaceAMember.id,
        user: systemAdmin,
        overrideAccess: false,
      })

      expect(other.id).toBe(workspaceAMember.id)

      await expectAccessDenied(() =>
        payload.create({
          collection: 'users',
          user: workspaceAMember,
          overrideAccess: false,
          data: {
            email: 'denied-user@example.com',
            firstName: 'Denied',
            lastName: 'User',
            password: 'AccessTestPassword1!',
            roles: ['SYSTEM_USER'],
          },
        }),
      )
    })
  })
})
