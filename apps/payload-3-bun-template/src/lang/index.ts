import en from './en'
import es from './es'

import { Config } from 'payload'

const locales = [
  {
    label: 'English',
    code: 'en',
  },
  {
    label: 'Español',
    code: 'es',
  },
]

const defaultLocale = 'en'

// UI translations
export const i18n: Config['i18n'] = {
  fallbackLanguage: defaultLocale,
  supportedLanguages: { en, es },
  translations: {
    en,
    es,
  },
}

// Database translations
export const localization: Config['localization'] = {
  locales,
  defaultLocale,
  fallback: true,
}
