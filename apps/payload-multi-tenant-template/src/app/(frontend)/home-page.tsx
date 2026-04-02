'use client'

import { Button, H1, Paragraph, Separator, Text, XStack, YStack } from '@dappermountain/design-system'
import { useTranslation } from '@payloadcms/ui'
import Image from 'next/image'
import type { ComponentType } from 'react'

/**
 * Tamagui `config` build types are loose; widen only where needed for token props.
 */
type TamaguiChild = ComponentType<Record<string, unknown>>

const RootStack = YStack as TamaguiChild
const Col = YStack as TamaguiChild
const Row = XStack as TamaguiChild
const Title = H1 as TamaguiChild
const Body = Paragraph as TamaguiChild
const Rule = Separator as TamaguiChild
const Action = Button as TamaguiChild
const Label = Text as TamaguiChild

export type HomePageProps = {
  adminHref: string
  userEmail: string | null
}

/**
 * Public site uses `TranslationProvider` in `(frontend)/layout` — same `useTranslation()` API as admin.
 * @see https://payloadcms.com/docs/custom-components/overview#getting-the-current-language
 */
export function HomePage(props: HomePageProps) {
  const { adminHref, userEmail } = props
  const { t } = useTranslation()

  return (
    <RootStack
      backgroundColor="$background"
      flex={1}
      minHeight="100vh"
      width="100%"
      padding="$4"
      paddingVertical="$8"
      alignItems="center"
      justifyContent="center"
      gap="$6"
    >
      <Col
        flex={1}
        width="100%"
        maxWidth={1024}
        alignSelf="center"
        alignItems="center"
        justifyContent="center"
        gap="$6"
      >
        <Col
          padding="$6"
          borderRadius="$4"
          width="100%"
          maxWidth={560}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$color1"
          shadowColor="$shadowColor"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.12}
          shadowRadius={8}
        >
          <Col alignItems="center" gap="$4">
            <Image
              alt={t('custom:app.frontend.logoAlt' as never)}
              height={64}
              src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
              width={64}
            />
            <Title fontFamily="$heading" fontSize="$10" lineHeight="$9" textAlign="center" color="$color12">
              {userEmail
                ? t('custom:app.frontend.welcomeBack' as never)
                : t('custom:app.frontend.welcome' as never)}
            </Title>
            {userEmail ? (
              <Body color="$color11" textAlign="center" size="$5">
                {t('custom:app.frontend.signedInPrefix' as never)}
                <Label fontWeight="600">{userEmail}</Label>
              </Body>
            ) : (
              <Body color="$color11" textAlign="center" size="$5">
                {t('custom:app.frontend.signedOutBlurb' as never)}
              </Body>
            )}
            <Rule borderColor="$borderColor" />
            <Row flexWrap="wrap" gap="$3" justifyContent="center" width="100%">
              <Action
                size="$4"
                theme="accent"
                render={<a />}
                href={adminHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('custom:app.frontend.openAdmin' as never)}
              </Action>
              <Action
                chromeless
                size="$4"
                borderWidth={1}
                borderColor="$borderColor"
                render={<a />}
                href="https://payloadcms.com/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('custom:app.frontend.documentation' as never)}
              </Action>
            </Row>
          </Col>
        </Col>
      </Col>
    </RootStack>
  )
}
