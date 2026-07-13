'use client'

import { TranslationProvider } from '@payloadcms/ui'
import type { LanguageOptions } from 'payload'
import type { I18nClient, I18nOptions } from '@payloadcms/translations'
import type { ReactNode } from 'react'

export type FrontendProvidersProps = {
  children: ReactNode
  dateFNSKey: I18nClient['dateFNSKey']
  fallbackLang: I18nOptions['fallbackLanguage']
  language: string
  languageOptions: LanguageOptions
  switchLanguageServerAction: (lang: string) => Promise<void>
  translations: I18nClient['translations']
}

/** Client providers for the public frontend segment (i18n). */
export function FrontendProviders(props: FrontendProvidersProps) {
  const {
    children,
    dateFNSKey,
    fallbackLang,
    language,
    languageOptions,
    switchLanguageServerAction,
    translations,
  } = props

  return (
    <TranslationProvider
      dateFNSKey={dateFNSKey}
      fallbackLang={fallbackLang}
      language={language}
      languageOptions={languageOptions}
      switchLanguageServerAction={switchLanguageServerAction}
      translations={translations}
    >
      {children}
    </TranslationProvider>
  )
}
