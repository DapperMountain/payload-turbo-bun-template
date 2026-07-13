'use client'

import { Languages } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'
import { useTransition } from 'react'

import { useAppTranslation } from '@/utils/i18n.client'

export type LanguageSwitcherVariant = 'overlay' | 'header'

export type LanguageSwitcherProps = {
  variant?: LanguageSwitcherVariant
}

/**
 * Payload frontend language control — sets the `payload-lng` cookie and refreshes RSC content.
 */
export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const { variant = 'overlay' } = props
  const { i18n, languageOptions, switchLanguage, t } = useAppTranslation()
  const [pending, startTransition] = useTransition()

  if (!languageOptions || languageOptions.length < 2 || !switchLanguage) {
    return null
  }

  const language = i18n.language

  const control = (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-sm transition-colors',
        variant === 'overlay' &&
          'pointer-events-auto h-9 rounded-lg border border-border/60 bg-background/80 px-3 shadow-sm backdrop-blur-sm hover:bg-accent/50',
        variant === 'header' &&
          'h-8 rounded-md border border-input bg-background px-2.5 shadow-xs hover:bg-accent/50',
      )}
    >
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
  )

  if (variant === 'overlay') {
    return (
      <div className="pointer-events-none absolute top-0 right-0 z-20 flex w-full justify-end p-4 sm:p-6">
        {control}
      </div>
    )
  }

  return control
}
