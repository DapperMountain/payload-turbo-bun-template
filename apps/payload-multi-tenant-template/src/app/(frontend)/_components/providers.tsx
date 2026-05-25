'use client'

import { TranslationProvider } from '@payloadcms/ui'
import { DesignSystemProvider } from '@dappermountain/design-system/next'
import { Stack } from '@dappermountain/design-system'
import type { LanguageOptions } from 'payload'
import type { I18nClient, I18nOptions } from '@payloadcms/translations'
import type { ReactNode } from 'react'

import { LanguageSwitcher } from './language-switcher'

export type FrontendProvidersProps = {
  children: ReactNode
  dateFNSKey: I18nClient['dateFNSKey']
  fallbackLang: I18nOptions['fallbackLanguage']
  language: string
  languageOptions: LanguageOptions
  switchLanguageServerAction: (lang: string) => Promise<void>
  translations: I18nClient['translations']
}

/** Client providers for the public frontend segment (i18n + design system). */
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
      <DesignSystemProvider>
        <Stack flex={1} minHeight="100vh" position="relative" width="100%">
          <LanguageSwitcher
            language={language}
            languageOptions={languageOptions}
            switchLanguage={switchLanguageServerAction}
          />
          {children}
        </Stack>
      </DesignSystemProvider>
    </TranslationProvider>
  )
}
