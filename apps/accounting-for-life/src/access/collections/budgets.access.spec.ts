import { describe, it } from 'bun:test'

import { budgetsAccess } from '@/access/collections'
import {
  budgetReadonlyUser,
  expectAccess,
  systemAdminUser,
  workspaceAdminUser,
  workspaceMemberUser,
} from '@/access/test'

const budgetDocScope = { id: { in: ['budget-a'] } }
const workspaceScope = { workspace: { in: ['workspace-a'] } }

describe('budgetsAccess', () => {
  describe('read', () => {
    const read = budgetsAccess.read!

    it('allows system admins full access', async () => {
      await expectAccess(read, systemAdminUser, true)
    })

    it('scopes members to budgets they belong to', async () => {
      await expectAccess(read, workspaceMemberUser, budgetDocScope)
    })

    it('allows readonly members to read', async () => {
      await expectAccess(read, budgetReadonlyUser, budgetDocScope)
    })
  })

  describe('create', () => {
    const create = budgetsAccess.create!

    it('allows workspace admins (workspace create scope)', async () => {
      await expectAccess(create, workspaceAdminUser, workspaceScope)
    })

    it('denies ordinary budget members', async () => {
      await expectAccess(create, workspaceMemberUser, false)
    })
  })

  describe('update', () => {
    const update = budgetsAccess.update!

    it('allows budget admins', async () => {
      await expectAccess(update, workspaceAdminUser, budgetDocScope)
    })

    it('denies non-admin members', async () => {
      await expectAccess(update, workspaceMemberUser, false)
      await expectAccess(update, budgetReadonlyUser, false)
    })
  })

  describe('delete', () => {
    const del = budgetsAccess.delete!
    const trashData = { data: { deletedAt: '2026-07-14T00:00:00.000Z' } }

    it('allows budget admins to soft-delete (trash)', async () => {
      await expectAccess(del, workspaceAdminUser, budgetDocScope, trashData)
      await expectAccess(del, systemAdminUser, true, trashData)
    })

    it('denies non-admin members soft-delete', async () => {
      await expectAccess(del, workspaceMemberUser, false, trashData)
      await expectAccess(del, budgetReadonlyUser, false, trashData)
    })

    it('allows only system admins to permanently delete', async () => {
      await expectAccess(del, systemAdminUser, true)
      await expectAccess(del, workspaceAdminUser, false)
      await expectAccess(del, workspaceMemberUser, false)
    })
  })
})
