import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AccountLabel } from '@/app/(frontend)/_components/account-label'
import { PayloadFilterBar } from '@/app/(frontend)/_components/payload-filter-bar'
import { TransactionFormDialog } from '@/app/(frontend)/_components/transaction-form-dialog'
import { TransactionsRegister } from '@/app/(frontend)/_components/transactions-register'
import {
  accountBudgetId,
  mergeAccountTransactionFilters,
  sumPostedAccountBalance,
} from '@/lib/frontend/account-transactions.server'
import {
  buildCategoryOptionsByBudget,
  buildGroupedCategoryFilterOptions,
  buildScopedCategoryFilterOptions,
  categoryDisplayLabel,
} from '@/lib/frontend/category-filter-options'
import { transactionFilterFields } from '@/lib/filters/fields'
import { parseFiltersParam } from '@/lib/filters/parse'
import { getAppPayload } from '@/lib/frontend/payload.server'
import { buildGroupedAccountOptions } from '@/lib/frontend/transaction-picker-options'
import { findFilteredTransactions } from '@/lib/frontend/transaction-query.server'
import { findPayeesByBudget } from '@/lib/frontend/transaction-payees.server'
import { groupTransactionsByDate, withNewestFirstRunningBalances } from '@/lib/frontend/transactions.server'
import type { Account, Category, User } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { getRequestI18n } from '@/utils/i18n.server'
import { Button } from '@dappermountain/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@dappermountain/ui/components/card'
import { ChevronLeft } from '@dappermountain/ui/icons'

import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

export type AccountDetailViewProps = {
  account: Account
  accounts: Account[]
  accountLabels: Record<string, string>
  balance: number
  budgets: { id: string; name: string }[]
  categories: Category[]
  categoryFilterOptions: RelationshipFilterOption[]
  categoryOptionsByBudget: Record<string, RelationshipFilterOption[]>
  groupedCategoryOptions: RelationshipFilterOption[]
  payeeOptionsByBudget: Record<string, string[]>
  registerGroups: ReturnType<typeof groupTransactionsByDate>
  transactionCount: number
  transactions: import('@/types').Transaction[]
}

export async function AccountDetailViewLoader(props: {
  user: User
  workspaceId: string
  accountId: string
  filtersRaw?: string
}) {
  const payload = await getAppPayload()
  const urlClauses = parseFiltersParam(props.filtersRaw)
  const clauses = mergeAccountTransactionFilters(urlClauses, props.accountId)

  let account: Account
  try {
    account = await payload.findByID({
      collection: 'accounts',
      id: props.accountId,
      depth: 1,
      user: props.user,
      overrideAccess: false,
    })
  } catch {
    notFound()
  }

  const accountWorkspaceId = getCollectionId(account.workspace)
  if (accountWorkspaceId !== props.workspaceId) {
    notFound()
  }

  const budgetId = accountBudgetId(account)

  const [txResult, accounts, budgets, categories, balanceSnapshot, payeeOptionsByBudget] =
    await Promise.all([
    findFilteredTransactions(payload, {
      user: props.user,
      workspaceId: props.workspaceId,
      clauses,
    }),
    payload.find({
      collection: 'accounts',
      where: { workspace: { equals: props.workspaceId } },
      limit: 100,
      depth: 0,
      sort: 'name',
      user: props.user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'budgets',
      where: { workspace: { equals: props.workspaceId } },
      limit: 50,
      depth: 0,
      user: props.user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'categories',
      where: { workspace: { equals: props.workspaceId } },
      limit: 500,
      depth: 1,
      sort: 'name',
      user: props.user,
      overrideAccess: false,
    }),
    sumPostedAccountBalance(payload, {
      user: props.user,
      workspaceId: props.workspaceId,
      accountId: account.id,
    }),
    findPayeesByBudget(payload, {
      user: props.user,
      workspaceId: props.workspaceId,
    }),
  ])

  const budgetList = budgets.docs.map((b) => ({ id: b.id, name: b.name }))

  const categoryOptionsByBudget = buildCategoryOptionsByBudget(categories.docs, budgetList)
  const groupedCategoryOptions = buildGroupedCategoryFilterOptions(categories.docs, budgetList)
  const categoryFilterOptions = budgetId
    ? buildScopedCategoryFilterOptions(categories.docs, budgetId)
    : groupedCategoryOptions

  const formCategories = categories.docs.map((c) => ({
    id: c.id,
    label: categoryDisplayLabel(c),
    budgetId: getCollectionId(c.budget) ?? '',
  }))

  const displayLabels = {
    accounts: Object.fromEntries(accounts.docs.map((item) => [item.id, item.name])),
    categories: Object.fromEntries(formCategories.map((category) => [category.id, category.label])),
  }

  return (
    <AccountDetailView
      account={account}
      accounts={accounts.docs}
      accountLabels={displayLabels.accounts}
      balance={balanceSnapshot.balance}
      budgets={budgetList}
      categories={categories.docs}
      categoryFilterOptions={categoryFilterOptions}
      categoryOptionsByBudget={categoryOptionsByBudget}
      groupedCategoryOptions={groupedCategoryOptions}
      payeeOptionsByBudget={payeeOptionsByBudget}
      registerGroups={withNewestFirstRunningBalances(
        groupTransactionsByDate(txResult.docs, displayLabels, {
          accountId: props.accountId,
        }),
        balanceSnapshot.balance,
      )}
      transactionCount={balanceSnapshot.transactionCount}
      transactions={txResult.docs}
    />
  )
}

export async function AccountDetailView(props: AccountDetailViewProps) {
  const {
    account,
    transactions,
    registerGroups,
    accounts,
    accountLabels,
    balance,
    transactionCount,
    budgets,
    categories,
    categoryFilterOptions,
    categoryOptionsByBudget,
    groupedCategoryOptions,
    payeeOptionsByBudget,
  } = props
  const { t } = await getRequestI18n()

  const budgetId = accountBudgetId(account)
  const accountFilterOptions = buildGroupedAccountOptions(accounts, budgetId ?? undefined)

  const relationshipOptions = {
    budget: budgets.map((b) => ({ id: b.id, label: b.name })),
    'entries.category': categoryFilterOptions,
    'entries.account': accountFilterOptions,
  }

  const relationshipFieldConfig = {
    'entries.category': {
      scopeBudgetField: 'budget',
      byBudget: categoryOptionsByBudget,
      grouped: groupedCategoryOptions,
    },
  }

  const filterFields = transactionFilterFields.filter((field) => field.id !== 'entries.account')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild className="-ml-2 h-8" size="sm" variant="ghost">
            <Link href="/accounts">
              <ChevronLeft className="mr-1 size-4" />
              {t('custom:frontend:accounts:backToList')}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <AccountLabel
                account={account}
                iconClassName="size-6"
                name={account.name}
                nameClassName="truncate"
              />
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(`custom:fields:accounts:classification:${account.classification}`)}
              {' · '}
              {t(`custom:fields:accounts:subtype:${account.subtype}`)}
              {typeof account.budget === 'object' && account.budget ? ` · ${account.budget.name}` : ''}
            </p>
          </div>
        </div>
        <TransactionFormDialog
          accounts={accounts}
          budgetId={budgetId}
          categories={categories}
          defaultPaymentAccountId={account.id}
          payeeOptions={budgetId ? (payeeOptionsByBudget[budgetId] ?? []) : []}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-6">
          <Suspense fallback={null}>
            <PayloadFilterBar
              fields={filterFields}
              relationshipFieldConfig={relationshipFieldConfig}
              relationshipOptions={relationshipOptions}
            />
          </Suspense>

          <TransactionsRegister
            accountLabels={accountLabels}
            accounts={accounts}
            categories={categories}
            hiddenColumns={['account']}
            payeeOptionsByBudget={payeeOptionsByBudget}
            registerGroups={registerGroups}
            transactions={transactions}
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('custom:frontend:accounts:summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('custom:frontend:accounts:balance')}</p>
              <p className="text-2xl font-semibold tabular-nums">{formatMoney(balance)}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('custom:frontend:accounts:accountType')}</span>
              <AccountLabel
                account={account}
                name={t(`custom:fields:accounts:subtype:${account.subtype}`)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t('custom:frontend:accounts:transactionCount')}</span>
              <span className="tabular-nums">{transactionCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
