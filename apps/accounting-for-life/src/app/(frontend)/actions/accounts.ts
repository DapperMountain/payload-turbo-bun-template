'use server'

import { revalidatePath } from 'next/cache'
import config from '@payload-config'
import { getPayload } from 'payload'

import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'
import type { Account } from '@/types'

export type CreateAccountInput = {
  name: string
  classification: Account['classification']
  subtype: Account['subtype']
  unit: string
  budget: string
  isOnBudget?: boolean
}

export async function createAccountAction(input: CreateAccountInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { user, headers } = await requireAppUser('/accounts')
    const workspace = await resolveActiveWorkspace(user, headers)

    if (!workspace) {
      return { ok: false, error: 'No workspace selected' }
    }

    const payload = await getPayload({ config: await config })

    await payload.create({
      collection: 'accounts',
      data: {
        name: input.name,
        classification: input.classification,
        subtype: input.subtype,
        unit: input.unit,
        budget: input.budget,
        isOnBudget: input.isOnBudget ?? true,
        workspace: workspace.id,
      },
      user,
      overrideAccess: false,
    })

    revalidatePath('/accounts')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create account' }
  }
}
