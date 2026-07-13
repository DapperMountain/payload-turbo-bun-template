import { getAppPayload } from '@/lib/frontend/payload.server'
import { Suspense } from 'react'

import { PayloadFilterBar } from '@/app/(frontend)/_components/payload-filter-bar'
import { TransactionFormDialog } from '@/app/(frontend)/_components/transaction-form-dialog'
import { TransactionsRegister } from '@/app/(frontend)/_components/transactions-register'
import { activeBudgetIdFromClauses } from '@/lib/filters/budget-scope'
import { transactionFilterFields } from '@/lib/filters/fields'
import { parseFiltersParam } from '@/lib/filters/parse'
import {
  buildCategoryOptionsByBudget,
  buildGroupedCategoryFilterOptions,
  buildScopedCategoryFilterOptions,
  categoryDisplayLabel,
} from '@/lib/frontend/category-filter-options'
import { findFilteredTransactions } from '@/lib/frontend/transaction-query.server'
import { findPayeeMemosByBudget } from '@/lib/frontend/transaction-payees.server'
import { buildGroupedAccountOptions } from '@/lib/frontend/transaction-picker-options'
import { groupTransactionsByDate } from '@/lib/frontend/transactions.server'
import type { Account, Category, User } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { getRequestI18n } from '@/utils/i18n.server'

import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'

export type TransactionsViewProps = {
  accounts: Account[]
  accountLabels: Record<string, string>
  activeBudgetId: string | null
  budgets: { id: string; name: string }[]
  categories: Category[]
  categoryFilterOptions: RelationshipFilterOption[]
  categoryOptionsByBudget: Record<string, RelationshipFilterOption[]>
  groupedCategoryOptions: RelationshipFilterOption[]
  payeeOptionsByBudget: Record<string, string[]>
  registerGroups: ReturnType<typeof groupTransactionsByDate>
  transactions: import('@/types').Transaction[]
}

export async function TransactionsViewLoader(props: {
  user: User
  workspaceId: string
  filtersRaw?: string
  activeBudgetId: string | null
}) {
  const payload = await getAppPayload()
  const clauses = parseFiltersParam(props.filtersRaw)
  const activeBudgetId = activeBudgetIdFromClauses(clauses)

  const [txResult, accounts, budgets, categories, payeeOptionsByBudget] = await Promise.all([
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
    findPayeeMemosByBudget(payload, {
      user: props.user,
      workspaceId: props.workspaceId,
    }),
  ])

  const budgetList = budgets.docs.map((b) => ({ id: b.id, name: b.name }))

  const categoryOptionsByBudget = buildCategoryOptionsByBudget(categories.docs, budgetList)
  const groupedCategoryOptions = buildGroupedCategoryFilterOptions(categories.docs, budgetList)
  const categoryFilterOptions = activeBudgetId
    ? buildScopedCategoryFilterOptions(categories.docs, activeBudgetId)
    : groupedCategoryOptions

  const formCategories = categories.docs.map((c) => ({
    id: c.id,
    label: categoryDisplayLabel(c),
    budgetId: getCollectionId(c.budget) ?? '',
  }))

  const displayLabels = {
    accounts: Object.fromEntries(accounts.docs.map((account) => [account.id, account.name])),
    categories: Object.fromEntries(formCategories.map((category) => [category.id, category.label])),
  }

  return (
    <TransactionsView
      accounts={accounts.docs}
      accountLabels={displayLabels.accounts}
      activeBudgetId={props.activeBudgetId}
      budgets={budgetList}
      categories={categories.docs}
      categoryFilterOptions={categoryFilterOptions}
      categoryOptionsByBudget={categoryOptionsByBudget}
      groupedCategoryOptions={groupedCategoryOptions}
      payeeOptionsByBudget={payeeOptionsByBudget}
      registerGroups={groupTransactionsByDate(txResult.docs, displayLabels)}
      transactions={txResult.docs}
    />
  )
}

export async function TransactionsView(props: TransactionsViewProps) {
  const {
    transactions,
    registerGroups,
    accounts,
    accountLabels,
    activeBudgetId,
    budgets,
    categories,
    categoryFilterOptions,
    categoryOptionsByBudget,
    groupedCategoryOptions,
    payeeOptionsByBudget,
  } = props
  const { t } = await getRequestI18n()

  const accountFilterOptions = buildGroupedAccountOptions(accounts, activeBudgetId ?? undefined)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('custom:collections:transactions:plural')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('custom:collections:transactions:description')}</p>
        </div>
        <TransactionFormDialog
          accounts={accounts}
          budgetId={activeBudgetId}
          categories={categories}
          payeeOptions={activeBudgetId ? (payeeOptionsByBudget[activeBudgetId] ?? []) : []}
        />
      </div>

      <Suspense fallback={null}>
        <PayloadFilterBar
          fields={transactionFilterFields}
          relationshipFieldConfig={relationshipFieldConfig}
          relationshipOptions={relationshipOptions}
        />
      </Suspense>

      <TransactionsRegister
        accountLabels={accountLabels}
        accounts={accounts}
        categories={categories}
        payeeOptionsByBudget={payeeOptionsByBudget}
        registerGroups={registerGroups}
        transactions={transactions}
      />
    </div>
  )
}
