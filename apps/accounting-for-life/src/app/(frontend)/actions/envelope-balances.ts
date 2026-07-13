'use server'

import { revalidatePath } from 'next/cache'
import config from '@payload-config'
import { getPayload } from 'payload'

import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'
import { getCollectionId } from '@/utils'

export type UpdateEnvelopeAssignedInput = {
  budgetId: string
  categoryId: string
  year: number
  month: number
  assigned: number
}

export async function updateEnvelopeAssignedAction(
  input: UpdateEnvelopeAssignedInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(input.assigned)) {
    return { ok: false, error: 'Invalid amount' }
  }

  if (input.month < 1 || input.month > 12) {
    return { ok: false, error: 'Invalid month' }
  }

  try {
    const { user, headers } = await requireAppUser('/budgets')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getPayload({ config: await config })

    const [budget, category] = await Promise.all([
      payload.findByID({
        collection: 'budgets',
        id: input.budgetId,
        depth: 0,
        user,
        overrideAccess: false,
      }),
      payload.findByID({
        collection: 'categories',
        id: input.categoryId,
        depth: 0,
        user,
        overrideAccess: false,
      }),
    ])

    if (getCollectionId(budget.workspace) !== workspace.id) {
      return { ok: false, error: 'Budget not in active workspace' }
    }

    if (getCollectionId(category.budget) !== input.budgetId) {
      return { ok: false, error: 'Category does not belong to this budget' }
    }

    if (category.purpose === 'income') {
      return { ok: false, error: 'Income categories are not assigned — they flow to Ready to assign' }
    }

    const existing = await payload.find({
      collection: 'envelope-balances',
      where: {
        and: [
          { budget: { equals: input.budgetId } },
          { category: { equals: input.categoryId } },
          { year: { equals: input.year } },
          { month: { equals: input.month } },
        ],
      },
      limit: 1,
      depth: 0,
      user,
      overrideAccess: false,
    })

    const data = {
      budget: input.budgetId,
      category: input.categoryId,
      year: input.year,
      month: input.month,
      assigned: input.assigned,
      workspace: workspace.id,
    }

    if (existing.docs[0]) {
      await payload.update({
        collection: 'envelope-balances',
        id: existing.docs[0].id,
        data: { assigned: input.assigned },
        user,
        overrideAccess: false,
      })
    } else {
      await payload.create({
        collection: 'envelope-balances',
        data,
        user,
        overrideAccess: false,
      })
    }

    revalidatePath(`/budgets/${input.budgetId}`)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to update assignment',
    }
  }
}
