import type { Budget, User, Workspace } from '@/types'
import { expect } from 'bun:test'
import type { Payload } from 'payload'

export const TEST_PASSWORD = 'AccessTestPassword1!'

export type AccessFixtureUsers = {
  systemAdmin: User
  workspaceAAdmin: User
  workspaceAMember: User
  workspaceBMember: User
  outsider: User
}

export type AccessFixtures = {
  workspaceA: Workspace
  workspaceB: Workspace
  budgetA: Budget
  budgetB: Budget
  users: AccessFixtureUsers
  emails: {
    systemAdmin: string
    workspaceAAdmin: string
    workspaceAMember: string
    workspaceBMember: string
    outsider: string
  }
}

const emails = {
  systemAdmin: 'access-system-admin@example.com',
  workspaceAAdmin: 'access-workspace-a-admin@example.com',
  workspaceAMember: 'access-workspace-a-member@example.com',
  workspaceBMember: 'access-workspace-b-member@example.com',
  outsider: 'access-outsider@example.com',
} as const

/**
 * Seeds two workspaces, budgets, and users for collection access integration tests.
 *
 * Uses `overrideAccess: true` — callers must pass `overrideAccess: false` when exercising rules.
 */
export async function seedAccessFixtures(payload: Payload): Promise<AccessFixtures> {
  const workspaceA = await payload.create({
    collection: 'workspaces',
    data: {
      name: 'Access Test Workspace A',
      description: 'Workspace A for access integration tests',
      domain: 'access-a.example.com',
    },
    overrideAccess: true,
  })

  const workspaceB = await payload.create({
    collection: 'workspaces',
    data: {
      name: 'Access Test Workspace B',
      description: 'Workspace B for access integration tests',
      domain: 'access-b.example.com',
    },
    overrideAccess: true,
  })

  const budgetA = await payload.create({
    collection: 'budgets',
    data: {
      name: 'Budget A',
      isDefault: true,
      workspace: workspaceA.id,
    },
    overrideAccess: true,
    context: { skipCategorySeed: true },
  })

  const budgetB = await payload.create({
    collection: 'budgets',
    data: {
      name: 'Budget B',
      isDefault: true,
      workspace: workspaceB.id,
    },
    overrideAccess: true,
    context: { skipCategorySeed: true },
  })

  const systemAdmin = await payload.create({
    collection: 'users',
    data: {
      email: emails.systemAdmin,
      firstName: 'System',
      lastName: 'Admin',
      password: TEST_PASSWORD,
      roles: ['SYSTEM_ADMIN'],
      workspaces: [],
    },
    overrideAccess: true,
  })

  const workspaceAAdmin = await payload.create({
    collection: 'users',
    data: {
      email: emails.workspaceAAdmin,
      firstName: 'A',
      lastName: 'Admin',
      password: TEST_PASSWORD,
      roles: ['SYSTEM_USER'],
      workspaces: [{ workspace: workspaceA.id, roles: ['WORKSPACE_ADMIN'] }],
    },
    overrideAccess: true,
  })

  const workspaceAMember = await payload.create({
    collection: 'users',
    data: {
      email: emails.workspaceAMember,
      firstName: 'A',
      lastName: 'Member',
      password: TEST_PASSWORD,
      roles: ['SYSTEM_USER'],
      workspaces: [{ workspace: workspaceA.id, roles: ['WORKSPACE_USER'] }],
    },
    overrideAccess: true,
  })

  const workspaceBMember = await payload.create({
    collection: 'users',
    data: {
      email: emails.workspaceBMember,
      firstName: 'B',
      lastName: 'Member',
      password: TEST_PASSWORD,
      roles: ['SYSTEM_USER'],
      workspaces: [{ workspace: workspaceB.id, roles: ['WORKSPACE_USER'] }],
    },
    overrideAccess: true,
  })

  const outsider = await payload.create({
    collection: 'users',
    data: {
      email: emails.outsider,
      firstName: 'No',
      lastName: 'Workspace',
      password: TEST_PASSWORD,
      roles: ['SYSTEM_USER'],
      workspaces: [],
    },
    overrideAccess: true,
  })

  return {
    workspaceA,
    workspaceB,
    budgetA,
    budgetB,
    users: {
      systemAdmin,
      workspaceAAdmin,
      workspaceAMember,
      workspaceBMember,
      outsider,
    },
    emails,
  }
}

export async function loginAs(
  payload: Payload,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<User> {
  const result = await payload.login({
    collection: 'users',
    data: { email, password },
  })

  if (!result.user) {
    throw new Error(`Login failed for ${email}`)
  }

  return result.user
}

/** Asserts a Local API call is denied (Payload Forbidden / access error). */
export async function expectAccessDenied(run: () => Promise<unknown>): Promise<void> {
  try {
    await run()
    throw new Error('Expected access to be denied')
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected access to be denied') {
      throw error
    }

    expect(error).toBeDefined()
  }
}
