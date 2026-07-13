'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import config from '@payload-config'
import { getPayload } from 'payload'

import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'
import { getCollectionId } from '@/utils'

export type CreateBudgetInput = {
  name: string
  isDefault?: boolean
}

async function clearOtherDefaultBudgets(
  payload: Awaited<ReturnType<typeof getPayload>>,
  workspaceId: string,
  user: Parameters<typeof payload.update>[0]['user'],
  exceptId?: string,
) {
  const existing = await payload.find({
    collection: 'budgets',
    where: {
      and: [
        { workspace: { equals: workspaceId } },
        { isDefault: { equals: true } },
        ...(exceptId ? [{ id: { not_equals: exceptId } }] : []),
      ],
    },
    limit: 50,
    depth: 0,
    user,
    overrideAccess: false,
  })

  for (const budget of existing.docs) {
    await payload.update({
      collection: 'budgets',
      id: budget.id,
      data: { isDefault: false },
      user,
      overrideAccess: false,
    })
  }
}

export async function createBudgetAction(
  input: CreateBudgetInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, headers } = await requireAppUser('/budgets')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getPayload({ config: await config })

    if (input.isDefault) {
      await clearOtherDefaultBudgets(payload, workspace.id, user)
    }

    await payload.create({
      collection: 'budgets',
      data: {
        name: input.name,
        isDefault: input.isDefault ?? false,
        workspace: workspace.id,
      },
      user,
      overrideAccess: false,
    })

    revalidatePath('/budgets')
    revalidatePath('/dashboard')
    revalidatePath('/accounts')
    revalidatePath('/transactions')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create budget' }
  }
}

export async function switchBudgetAction(budgetId: string): Promise<{ ok: boolean }> {
  const { user, headers } = await requireAppUser()
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    return { ok: false }
  }

  const payload = await getPayload({ config: await config })

  try {
    const budget = await payload.findByID({
      collection: 'budgets',
      id: budgetId,
      depth: 0,
      user,
      overrideAccess: false,
    })

    if (getCollectionId(budget.workspace) !== workspace.id) {
      return { ok: false }
    }
  } catch {
    return { ok: false }
  }

  const cookieStore = await cookies()
  cookieStore.set('payload-budget', budgetId, { path: '/' })

  revalidatePath('/', 'layout')
  return { ok: true }
}
