import type { Config } from 'payload'

import { en as payloadEn } from '@payloadcms/translations/languages/en'
import { es as payloadEs } from '@payloadcms/translations/languages/es'

import { app as appEn } from './en'
import { app as appEs } from './es'

/** Single list: content locale labels + what we merge for admin `i18n`. Add a row when you add `fr.ts`, etc. */
const locales = [
  { code: 'en' as const, label: 'English', payload: payloadEn, app: appEn },
  { code: 'es' as const, label: 'Español', payload: payloadEs, app: appEs },
]

export type LocaleCode = (typeof locales)[number]['code']

const defaultLocale = locales[0]!.code

/** Nested `app` → flat keys under Payload’s `custom` (e.g. `app.frontend.welcome`). */
function flattenStrings(node: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenStrings(value as Record<string, unknown>, path))
    } else if (typeof value === 'string') {
      out[path] = value
    }
  }
  return out
}

/**
 * Merge app copy into `translations.custom` so `initI18n` / `t()` see it (API context uses
 * `supportedLanguages[lang].translations` only — top-level `custom` would be ignored).
 */
function mergePayloadLocale(base: Record<string, unknown>, app: Record<string, unknown>): Record<string, unknown> {
  const translations = { ...((base.translations as Record<string, unknown>) ?? {}) }
  const prevCustom =
    translations.custom && typeof translations.custom === 'object' && !Array.isArray(translations.custom)
      ? { ...(translations.custom as Record<string, string>) }
      : {}
  const flat = flattenStrings(app)
  const fromApp = Object.fromEntries(Object.entries(flat).map(([k, v]) => [`app.${k}`, v]))
  return {
    ...base,
    translations: {
      ...translations,
      custom: { ...prevCustom, ...fromApp },
    },
  }
}

const supportedCodes = new Set<LocaleCode>(locales.map((l) => l.code))

const mergedLanguages = Object.fromEntries(
  locales.map((l) => [
    l.code,
    mergePayloadLocale(l.payload as Record<string, unknown>, l.app as unknown as Record<string, unknown>),
  ]),
)

/**
 * `i18n.translations` must map each locale to the **inner** `Language['translations']` tree only.
 * `initI18n` (client context) merges this into the filtered client bundle; if you pass full `Language`
 * objects here, `custom` ends up under `.translations` instead of the root and `t('custom:…')` never resolves.
 */
const translationsByLocale = Object.fromEntries(
  Object.entries(mergedLanguages).map(([code, pack]) => {
    const inner = (pack as { translations: Record<string, unknown> }).translations
    return [code, inner]
  }),
) as NonNullable<Config['i18n']>['translations']

export const i18n = {
  fallbackLanguage: defaultLocale,
  supportedLanguages: mergedLanguages,
  translations: translationsByLocale,
} as NonNullable<Config['i18n']>

export const localization: Config['localization'] = {
  locales: locales.map(({ code, label }) => ({ code, label })),
  defaultLocale,
  fallback: true,
}
