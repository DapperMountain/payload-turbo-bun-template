'use server'

import { cookies } from 'next/headers'
import config from '@payload-config'

export async function switchLanguageServerAction(lang: string) {
  const cfg = await config
  const cookieStore = await cookies()
  cookieStore.set({
    name: `${cfg.cookiePrefix ?? 'payload'}-lng`,
    path: '/',
    value: lang,
  })
}
