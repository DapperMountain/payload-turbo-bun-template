import type { User } from '@/types'

const baseUser = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  collection: 'users' as const,
}

/** Platform administrator with full workspace visibility. */
export const systemAdminUser: User = {
  ...baseUser,
  id: 'admin-1',
  email: 'admin@example.com',
  roles: ['SYSTEM_ADMIN'],
  workspaces: [],
}

/** Workspace member with `WORKSPACE_USER` on one workspace. */
export const workspaceMemberUser: User = {
  ...baseUser,
  roles: ['SYSTEM_USER'],
  workspaces: [
    {
      workspace: 'workspace-a',
      roles: ['WORKSPACE_USER'],
    },
  ],
  budgets: [
    {
      budget: 'budget-a',
      roles: ['BUDGET_MEMBER'],
    },
  ],
}

/** Workspace admin for one workspace. */
export const workspaceAdminUser: User = {
  ...baseUser,
  id: 'workspace-admin-1',
  email: 'workspace-admin@example.com',
  roles: ['SYSTEM_USER'],
  workspaces: [
    {
      workspace: 'workspace-a',
      roles: ['WORKSPACE_ADMIN'],
    },
  ],
  budgets: [
    {
      budget: 'budget-a',
      roles: ['BUDGET_ADMIN'],
    },
  ],
}

/** Budget read-only member (can view, not edit content). */
export const budgetReadonlyUser: User = {
  ...baseUser,
  id: 'budget-readonly-1',
  email: 'budget-readonly@example.com',
  roles: ['SYSTEM_USER'],
  workspaces: [
    {
      workspace: 'workspace-a',
      roles: ['WORKSPACE_USER'],
    },
  ],
  budgets: [
    {
      budget: 'budget-a',
      roles: ['BUDGET_READONLY'],
    },
  ],
}

/** Authenticated user with no workspace memberships. */
export const userWithoutWorkspaces: User = {
  ...baseUser,
  id: 'user-no-workspace',
  email: 'no-workspace@example.com',
  roles: ['SYSTEM_USER'],
  workspaces: [],
  budgets: [],
}

/** @deprecated Use {@link workspaceMemberUser}. */
export const tenantMemberUser = workspaceMemberUser

/** @deprecated Use {@link workspaceAdminUser}. */
export const tenantAdminUser = workspaceAdminUser

/** @deprecated Use {@link userWithoutWorkspaces}. */
export const userWithoutTenants = userWithoutWorkspaces
