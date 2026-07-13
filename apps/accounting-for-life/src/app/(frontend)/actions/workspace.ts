'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import config from '@payload-config'
import { getPayload } from 'payload'

import { requireAppUser } from '@/lib/frontend/auth.server'

export async function switchWorkspaceAction(workspaceId: string): Promise<{ ok: boolean }> {
  const { user } = await requireAppUser()
  const payload = await getPayload({ config: await config })

  try {
    await payload.findByID({
      collection: 'workspaces',
      id: workspaceId,
      depth: 0,
      user,
      overrideAccess: false,
    })
  } catch {
    return { ok: false }
  }

  const cookieStore = await cookies()
  cookieStore.set('payload-tenant', workspaceId, { path: '/' })

  revalidatePath('/', 'layout')
  return { ok: true }
}
