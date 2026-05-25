import type { Language } from '@payloadcms/translations'
import { en as payloadEn } from '@payloadcms/translations/languages/en'
import { es as payloadEs } from '@payloadcms/translations/languages/es'
import type { Config } from 'payload'

import en from './en'
import es from './es'

/** English project strings for config-time labels (e.g. collection field options). Same tree as `t('custom:…')`. */
export const custom = en.custom

export type { CustomTranslationKeys, CustomTranslationsObject } from './types'

/** Add a locale here (Payload pack + locale bundle from `src/lang/<code>.ts` + content label). */
const locales = [
  { code: 'en', label: 'English', payload: payloadEn, bundle: en },
  { code: 'es', label: 'Español', payload: payloadEs, bundle: es },
] as const

export type LocaleCode = (typeof locales)[number]['code']

const defaultLocale = locales[0].code

const supportedLanguages = Object.fromEntries(locales.map(({ code, payload }) => [code, payload])) as Record<
  LocaleCode,
  Language
>

const localeOverrides = Object.fromEntries(locales.map(({ code, bundle }) => [code, bundle])) as Record<
  LocaleCode,
  typeof en
>

export const i18n = {
  fallbackLanguage: defaultLocale,
  supportedLanguages,
  translations: localeOverrides,
} satisfies NonNullable<Config['i18n']>

export const localization = {
  defaultLocale,
  fallback: true,
  locales: locales.map(({ code, label }) => ({ code, label })),
} satisfies Config['localization']
