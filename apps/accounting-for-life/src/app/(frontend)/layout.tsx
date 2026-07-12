import type { AcceptedLanguages } from '@payloadcms/translations'
import type { LanguageOptions } from 'payload'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'

import config from '@payload-config'
import { getRequestI18n } from '@/utils/i18n.server'
import '@dappermountain/ui/globals.css'

import { FrontendProviders } from './_components/providers'
import { switchLanguageServerAction } from './actions/switch-language'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export default async function Layout(props: { children: ReactNode }) {
  const { children } = props
  const cfg = await config
  const i18n = await getRequestI18n()

  /** Prefer `localization.locales` — labels are stable; `supportedLanguages[*].translations` may be absent on the sanitized config. */
  const languageOptions: LanguageOptions =
    cfg.localization === false
      ? []
      : cfg.localization.locales.map((locale) => {
          const label =
            typeof locale.label === 'string'
              ? locale.label
              : (locale.label[locale.code] ??
                locale.label.en ??
                Object.values(locale.label)[0] ??
                locale.code)
          return { label, value: locale.code as AcceptedLanguages }
        })

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}>
        <FrontendProviders
          dateFNSKey={i18n.dateFNSKey}
          fallbackLang={cfg.i18n.fallbackLanguage as AcceptedLanguages}
          language={i18n.language}
          languageOptions={languageOptions}
          switchLanguageServerAction={switchLanguageServerAction}
          translations={i18n.translations}
        >
          {children}
        </FrontendProviders>
      </body>
    </html>
  )
}
