'use client'

import { Button } from '@dappermountain/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@dappermountain/ui/components/card'
import { Separator } from '@dappermountain/ui/components/separator'
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
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 p-4 py-8">
      <div className="flex w-full max-w-lg flex-col items-center gap-6">
        <Card className="w-full shadow-md">
          <CardHeader className="items-center text-center">
            <Image
              alt={t('custom:frontend:logoAlt')}
              className="mx-auto"
              height={64}
              src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
              width={64}
            />
            <CardTitle className="text-2xl">
              {userEmail ? t('custom:frontend:welcomeBack') : t('custom:frontend:welcome')}
            </CardTitle>
            {userEmail ? (
              <CardDescription>
                {t('custom:frontend:signedInPrefix')}
                <span className="font-semibold text-foreground">{userEmail}</span>
              </CardDescription>
            ) : (
              <CardDescription>{t('custom:frontend:signedOutBlurb')}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Separator />
          </CardContent>
          <CardFooter className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <a href={adminHref} rel="noopener noreferrer" target="_blank">
                {t('custom:frontend:openAdmin')}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://payloadcms.com/docs" rel="noopener noreferrer" target="_blank">
                {t('custom:frontend:documentation')}
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
