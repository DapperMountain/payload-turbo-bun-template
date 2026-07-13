import 'server-only'

import { cache } from 'react'
import config from '@payload-config'
import { getPayload } from 'payload'

/** One Payload instance per request — avoids repeated init on layout + page. */
export const getAppPayload = cache(async () => getPayload({ config: await config }))
