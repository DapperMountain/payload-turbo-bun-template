'use client'

import { Row, Stack } from '@dappermountain/design-system'
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
    <Stack
      alignItems="flex-end"
      padding="$4"
      pointerEvents="box-none"
      position="absolute"
      right={0}
      top={0}
      width="100%"
      zIndex={10}
    >
      <Row
        alignItems="center"
        backgroundColor="$color1"
        borderColor="$borderColor"
        borderRadius="$3"
        borderWidth={1}
        gap="$2"
        paddingHorizontal="$3"
        paddingVertical="$2"
        pointerEvents="auto"
      >
        <select
          aria-label={t('custom:frontend:chooseLanguage')}
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
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: pending ? 'wait' : 'pointer',
            font: 'inherit',
            outline: 'none',
          }}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Row>
    </Stack>
  )
}
