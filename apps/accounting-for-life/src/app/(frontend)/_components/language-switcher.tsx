'use client'

import type { LanguageOptions } from 'payload'
import { Languages } from '@dappermountain/ui/icons'
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
    <div className="pointer-events-none absolute top-0 right-0 z-20 flex w-full justify-end p-4 sm:p-6">
      <label className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 text-sm shadow-sm backdrop-blur-sm transition-colors hover:bg-accent/50">
        <Languages className="size-4 text-muted-foreground" aria-hidden />
        <span className="sr-only">{t('custom:frontend:chooseLanguage')}</span>
        <select
          aria-label={t('custom:frontend:chooseLanguage')}
          className="cursor-pointer bg-transparent text-sm font-medium outline-none disabled:cursor-wait"
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
