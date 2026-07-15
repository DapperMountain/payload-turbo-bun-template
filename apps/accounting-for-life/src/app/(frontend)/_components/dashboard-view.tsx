import Link from 'next/link'

import { Button } from '@dappermountain/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dappermountain/ui/components/card'
import { ArrowRight, BookOpen, Receipt, Wallet } from '@dappermountain/ui/icons'

import { getAppPayload } from '@/lib/frontend/payload.server'

import type { User } from '@/types'
import { getRequestI18n } from '@/utils/i18n.server'

export async function DashboardView(props: { user: User; workspaceId: string }) {
  const { user, workspaceId } = props
  const { t } = await getRequestI18n()
  const payload = await getAppPayload()

  const [accounts, transactions, budgets] = await Promise.all([
    payload.count({
      collection: 'accounts',
      where: { workspace: { equals: workspaceId } },
      user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'transactions',
      where: { workspace: { equals: workspaceId } },
      limit: 5,
      sort: '-date',
      depth: 1,
      user,
      overrideAccess: false,
    }),
    payload.count({
      collection: 'budgets',
      where: { workspace: { equals: workspaceId } },
      user,
      overrideAccess: false,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('custom:frontend:nav:dashboard')}</h1>
        <p className="text-sm text-muted-foreground">{t('custom:frontend:dashboard:subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('custom:collections:budgets:plural')}</CardDescription>
            <CardTitle className="text-3xl">{budgets.totalDocs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/budgets">
                <BookOpen className="size-4" />
                {t('custom:frontend:dashboard:viewBudgets')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('custom:collections:accounts:plural')}</CardDescription>
            <CardTitle className="text-3xl">{accounts.totalDocs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/accounts">
                <Wallet className="size-4" />
                {t('custom:frontend:dashboard:viewAccounts')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('custom:collections:transactions:plural')}</CardDescription>
            <CardTitle className="text-3xl">{transactions.totalDocs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/transactions">
                <Receipt className="size-4" />
                {t('custom:frontend:dashboard:viewTransactions')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('custom:frontend:dashboard:recentTransactions')}</CardTitle>
          <CardDescription>{t('custom:frontend:dashboard:recentTransactionsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('custom:frontend:transactions:empty')}</p>
          ) : (
            <ul className="space-y-2">
              {transactions.docs.map((tx) => (
                <li className="flex items-center justify-between text-sm" key={tx.id}>
                  <span>{tx.payee || t('custom:frontend:transactions:untitled')}</span>
                  <span className="text-muted-foreground">
                    {tx.date ? new Date(tx.date).toLocaleDateString() : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
