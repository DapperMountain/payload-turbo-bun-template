'use client'

import { useTranslation } from '@payloadcms/ui'

import type { CustomTranslationKeys, CustomTranslationsObject } from '@/lang/types'

/** Typed `useTranslation()` — project strings under `custom:*`, Payload admin under `general:*`, etc. */
export function useAppTranslation() {
  return useTranslation<CustomTranslationsObject, CustomTranslationKeys>()
}
