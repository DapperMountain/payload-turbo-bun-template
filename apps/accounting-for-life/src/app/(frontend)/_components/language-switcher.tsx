'use client'

import type { LanguageOptions } from 'payload'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { useAppTranslation } from '@/utils/i18n.client'

export type LanguageSwitcherProps = {
  language: string
  languageOptions: LanguageOptions
  switchLanguage: (lang: string) => Promise<void>
}

/**
 * Payload frontend language control — sets the `payload-lng` cookie and refreshes RSC content.
 */
export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const { language, languageOptions, switchLanguage } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (languageOptions.length < 2) {
    return null
  }

  return (
    <div className="pointer-events-none absolute top-0 right-0 z-10 flex w-full justify-end p-4">
      <label className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
        <span className="sr-only">{t('custom:frontend:chooseLanguage')}</span>
        <select
          aria-label={t('custom:frontend:chooseLanguage')}
          className="cursor-pointer bg-transparent outline-none disabled:cursor-wait"
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value
            if (next === language) {
              return
            }
            startTransition(async () => {
              await switchLanguage(next)
              router.refresh()
            })
          }}
          value={language}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
