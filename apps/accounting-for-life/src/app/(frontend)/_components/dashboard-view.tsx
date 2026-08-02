import Link from 'next/link'
import { Suspense } from 'react'

import { Button } from '@dappermountain/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dappermountain/ui/components/card'
import { ArrowRight, BookOpen, Receipt, Wallet } from '@dappermountain/ui/icons'

import { TransactionsRegister } from '@/app/(frontend)/_components/transactions-register'
import { categoryDisplayLabel } from '@/lib/frontend/category-filter-options'
import { getAppPayload } from '@/lib/frontend/payload.server'
import { findPayeesByBudget } from '@/lib/frontend/transaction-payees.server'
import { findFilteredTransactions } from '@/lib/frontend/transaction-query.server'
import { groupTransactionsByDate } from '@/lib/frontend/transactions.server'
import type { User } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { getRequestI18n } from '@/utils/i18n.server'

const RECENT_TRANSACTION_LIMIT = 8

export async function DashboardView(props: { user: User; workspaceId: string }) {
  const { user, workspaceId } = props
  const { t } = await getRequestI18n()
  const payload = await getAppPayload()

  const [
    accountsCount,
    budgetsCount,
    recent,
    accounts,
    categories,
    payeeOptionsByBudget,
    workspace,
    units,
  ] = await Promise.all([
      payload.count({
        collection: 'accounts',
        where: { workspace: { equals: workspaceId } },
        user,
        overrideAccess: false,
      }),
      payload.count({
        collection: 'budgets',
        where: { workspace: { equals: workspaceId } },
        user,
        overrideAccess: false,
      }),
      findFilteredTransactions(payload, {
        user,
        workspaceId,
        clauses: [],
        limit: RECENT_TRANSACTION_LIMIT,
        sort: '-date',
      }),
      payload.find({
        collection: 'accounts',
        where: { workspace: { equals: workspaceId } },
        limit: 100,
        depth: 0,
        sort: 'name',
        user,
        overrideAccess: false,
      }),
      payload.find({
        collection: 'categories',
        where: { workspace: { equals: workspaceId } },
        limit: 500,
        depth: 1,
        sort: 'name',
        user,
        overrideAccess: false,
      }),
      findPayeesByBudget(payload, {
        user,
        workspaceId,
      }),
      payload.findByID({
        collection: 'workspaces',
        id: workspaceId,
        depth: 0,
        user,
        overrideAccess: false,
      }),
      payload.find({
        collection: 'units',
        where: { workspace: { equals: workspaceId } },
        limit: 100,
        depth: 0,
        sort: 'code',
        user,
        overrideAccess: false,
      }),
    ])

  const accountLabels = Object.fromEntries(accounts.docs.map((account) => [account.id, account.name]))
  const categoryLabels = Object.fromEntries(
    categories.docs.map((category) => [category.id, categoryDisplayLabel(category)]),
  )
  const displayLabels = { accounts: accountLabels, categories: categoryLabels }
  const reportingCurrencyId =
    workspace.reportingCurrency != null
      ? (getCollectionId(workspace.reportingCurrency) ?? null)
      : null

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
            <CardTitle className="text-3xl">{budgetsCount.totalDocs}</CardTitle>
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
            <CardTitle className="text-3xl">{accountsCount.totalDocs}</CardTitle>
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
            <CardTitle className="text-3xl">{recent.totalDocs}</CardTitle>
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
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>{t('custom:frontend:dashboard:recentTransactions')}</CardTitle>
            <CardDescription>{t('custom:frontend:dashboard:recentTransactionsHint')}</CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/transactions">
              {t('custom:frontend:dashboard:viewTransactions')}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('custom:frontend:transactions:empty')}</p>
          ) : (
            <Suspense fallback={null}>
              <TransactionsRegister
                accountLabels={accountLabels}
                accounts={accounts.docs}
                categories={categories.docs}
                hiddenColumns={['balance']}
                payeeOptionsByBudget={payeeOptionsByBudget}
                registerGroups={groupTransactionsByDate(recent.docs, displayLabels)}
                reportingCurrencyId={reportingCurrencyId}
                transactions={recent.docs}
                units={units.docs}
              />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
