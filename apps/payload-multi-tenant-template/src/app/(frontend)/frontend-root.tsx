'use client'

import { TranslationProvider } from '@payloadcms/ui'
import { DesignSystemProvider } from '@dappermountain/design-system'
import type { LanguageOptions } from 'payload'
import type { I18nClient, I18nOptions } from '@payloadcms/translations'
import type { ReactNode } from 'react'

type FrontendRootProps = {
  children: ReactNode
  dateFNSKey: I18nClient['dateFNSKey']
  fallbackLang: I18nOptions['fallbackLanguage']
  language: string
  languageOptions: LanguageOptions
  switchLanguageServerAction: (lang: string) => Promise<void>
  translations: I18nClient['translations']
}

export function FrontendRoot(props: FrontendRootProps) {
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
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </TranslationProvider>
  )
}
