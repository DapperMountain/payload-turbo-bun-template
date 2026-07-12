'use client'

import { Body, Button, Divider, Label, PageTitle, Row, Stack } from '@dappermountain/design-system'
import Image from 'next/image'

import { useAppTranslation } from '@/utils/i18n.client'

export type HomePageProps = {
  adminHref: string
  userEmail: string | null
}

export function HomePage(props: HomePageProps) {
  const { adminHref, userEmail } = props
  const { t } = useAppTranslation()

  return (
    <Stack
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
      <Stack
        flex={1}
        width="100%"
        maxWidth={1024}
        alignSelf="center"
        alignItems="center"
        justifyContent="center"
        gap="$6"
      >
        <Stack
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
          <Stack alignItems="center" gap="$4">
            <Image
              alt={t('custom:frontend:logoAlt')}
              height={64}
              src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
              width={64}
            />
            <PageTitle fontFamily="$heading" fontSize="$10" lineHeight="$9" textAlign="center" color="$color12">
              {userEmail ? t('custom:frontend:welcomeBack') : t('custom:frontend:welcome')}
            </PageTitle>
            {userEmail ? (
              <Body color="$color11" textAlign="center" size="$5">
                {t('custom:frontend:signedInPrefix')}
                <Label fontWeight="600">{userEmail}</Label>
              </Body>
            ) : (
              <Body color="$color11" textAlign="center" size="$5">
                {t('custom:frontend:signedOutBlurb')}
              </Body>
            )}
            <Divider borderColor="$borderColor" />
            <Row flexWrap="wrap" gap="$3" justifyContent="center" width="100%">
              <Button
                size="$4"
                theme="accent"
                render={<a />}
                href={adminHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('custom:frontend:openAdmin')}
              </Button>
              <Button
                chromeless
                size="$4"
                borderWidth={1}
                borderColor="$borderColor"
                render={<a />}
                href="https://payloadcms.com/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('custom:frontend:documentation')}
              </Button>
            </Row>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  )
}
