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
import { ArrowUpRight, BookOpen, Wallet } from '@dappermountain/ui/icons'
import Image from 'next/image'

import { LanguageSwitcher } from '@/app/(frontend)/_components/language-switcher'
import { useAppTranslation } from '@/utils/i18n.client'

export type HomePageProps = {
  adminHref: string
  userEmail: string | null
}

export function HomePage(props: HomePageProps) {
  const { adminHref, userEmail } = props
  const { t } = useAppTranslation()

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden p-6">
      <LanguageSwitcher variant="overlay" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.97_0_0),oklch(1_0_0)_50%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.22_0_0),oklch(0.145_0_0)_55%)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.922_0_0/0.35)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.922_0_0/0.35)_1px,transparent_1px)] bg-size-[3rem_3rem] mask-[radial-gradient(ellipse_at_center,black,transparent_75%)] dark:bg-[linear-gradient(to_right,oklch(1_0_0/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.06)_1px,transparent_1px)]" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border/60 bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="items-center space-y-4 pb-2 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border bg-muted/50 p-3 shadow-sm">
              <Image
                alt={t('custom:frontend:logoAlt')}
                className="dark:invert"
                height={40}
                src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
                width={40}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {t('custom:frontend:appName')}
              </p>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {userEmail ? t('custom:frontend:welcomeBack') : t('custom:frontend:welcome')}
              </CardTitle>
              {userEmail ? (
                <CardDescription className="text-base">
                  {t('custom:frontend:signedInPrefix')}
                  <span className="font-medium text-foreground">{userEmail}</span>
                </CardDescription>
              ) : (
                <CardDescription className="text-base leading-relaxed">
                  {t('custom:frontend:signedOutBlurb')}
                </CardDescription>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-6">
            <Separator />
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {userEmail ? (
              <Button asChild className="w-full sm:w-auto" size="lg">
                <a href="/dashboard">
                  <Wallet className="size-4" />
                  {t('custom:frontend:openApp')}
                </a>
              </Button>
            ) : null}
            <Button asChild className="w-full sm:w-auto" size="lg" variant={userEmail ? 'outline' : 'default'}>
              <a href={adminHref} rel="noopener noreferrer" target="_blank">
                <Wallet className="size-4" />
                {t('custom:frontend:openAdmin')}
                <ArrowUpRight className="size-3.5 opacity-70" />
              </a>
            </Button>
            <Button asChild className="w-full sm:w-auto" size="lg" variant="outline">
              <a href="https://payloadcms.com/docs" rel="noopener noreferrer" target="_blank">
                <BookOpen className="size-4" />
                {t('custom:frontend:documentation')}
              </a>
            </Button>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('custom:frontend:tagline')}
        </p>
      </div>
    </main>
  )
}
