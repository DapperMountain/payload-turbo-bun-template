import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { HomePage } from './home-page'

export default async function Page() {
  const headers = await getHeaders()

  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return <HomePage adminHref={payloadConfig.routes.admin} userEmail={user?.email ?? null} />
}
