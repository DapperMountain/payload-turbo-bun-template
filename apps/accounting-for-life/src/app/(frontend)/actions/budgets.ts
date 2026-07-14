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
