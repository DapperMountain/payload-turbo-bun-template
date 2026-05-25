import 'server-only'

import { getNextRequestI18n } from '@payloadcms/next/utilities'
import { cache } from 'react'

import type { CustomTranslationKeys, CustomTranslationsObject } from '@/lang/types'
import config from '@payload-config'

/**
 * Request-scoped i18n for Server Components (same bundle as the frontend `TranslationProvider`).
 *
 * @example
 * const { t } = await getRequestI18n()
 * t('custom:frontend:welcome')
 */
export const getRequestI18n = cache(async () => {
  return getNextRequestI18n<CustomTranslationsObject, CustomTranslationKeys>({ config: await config })
})
