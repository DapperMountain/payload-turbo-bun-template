import 'server-only'

import { cache } from 'react'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAppPayload } from '@/lib/frontend/payload.server'
import { isAppUser } from '@/utils'
import type { User } from '@/types'

export const requireAppUser = cache(async (returnPath = '/dashboard'): Promise<{
  user: User
  headers: Headers
}> => {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getAppPayload()
  const { user } = await payload.auth({ headers })

  if (!isAppUser(user)) {
    const loginUrl = `${payloadConfig.routes.admin}/login?redirect=${encodeURIComponent(returnPath)}`
    redirect(loginUrl)
  }

  return { user, headers }
})
