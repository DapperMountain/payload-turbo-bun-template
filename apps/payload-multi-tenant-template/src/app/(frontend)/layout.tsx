import { getNextRequestI18n } from '@payloadcms/next/utilities'
import type { AcceptedLanguages } from '@payloadcms/translations'
import { cookies, headers } from 'next/headers'
import type { LanguageOptions } from 'payload'
import { getRequestLanguage } from 'payload'
import type { ReactNode } from 'react'

import config from '@payload-config'

import { FrontendRoot } from './frontend-root'
import './frontend-styles.css'
import { switchLanguageServerAction } from './switch-language'

export default async function FrontendLayout(props: { children: ReactNode }) {
  const { children } = props
  const cfg = await config
  const language = getRequestLanguage({
    config: cfg,
    cookies: await cookies(),
    headers: await headers(),
  })

  const i18n = await getNextRequestI18n({ config: cfg })

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
    <html lang={language} suppressHydrationWarning>
      <body
        style={{ margin: 0, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
        suppressHydrationWarning
      >
        <FrontendRoot
          dateFNSKey={i18n.dateFNSKey}
          fallbackLang={cfg.i18n.fallbackLanguage as AcceptedLanguages}
          language={i18n.language}
          languageOptions={languageOptions}
          switchLanguageServerAction={switchLanguageServerAction}
          translations={i18n.translations}
        >
          {children}
        </FrontendRoot>
      </body>
    </html>
  )
}
