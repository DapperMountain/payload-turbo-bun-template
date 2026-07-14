'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@dappermountain/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@dappermountain/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dappermountain/ui/components/table'
import { ChevronDown, ChevronRight } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { BudgetAssignedCell } from '@/app/(frontend)/_components/budget-assigned-cell'
import type {
  BudgetMonthCategoryRow,
  BudgetMonthGroupRow,
  BudgetMonthSnapshot,
} from '@/lib/frontend/budget-month.types'
import { useAppTranslation } from '@/utils/i18n.client'

export type BudgetMonthTableProps = {
  snapshot: BudgetMonthSnapshot
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

function activityClassName(
  amount: number,
  kind: 'income' | 'expense' | 'net' | 'spending' = 'spending',
): string {
  if (amount === 0) return 'text-muted-foreground'

  // Income / net: green is "good" inflow or surplus.
  if (kind === 'income' || kind === 'net') {
    if (amount > 0) return 'text-emerald-600 dark:text-emerald-400'
    return 'text-destructive'
  }

  // Spending / payment-envelope activity is outflow from the budget — never celebrate it green.
  return 'text-foreground'
}

function categoryActivityKind(
  purpose: BudgetMonthCategoryRow['purpose'],
): 'income' | 'spending' {
  return purpose === 'income' ? 'income' : 'spending'
}

function groupActivityKind(kind: BudgetMonthGroupRow['kind']): 'income' | 'spending' {
  return kind === 'income' ? 'income' : 'spending'
}

function availableClassName(amount: number): string {
  if (amount < 0) return 'text-destructive'
  if (amount > 0) return 'text-emerald-600 dark:text-emerald-400'
  return 'text-muted-foreground'
}

function readyToAssignBannerClass(amount: number): string {
  if (amount > 0) {
    return 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/50'
  }
  if (amount < 0) {
    return 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10'
  }
  return 'border-border bg-muted/40'
}

function readyToAssignAmountClass(amount: number): string {
  if (amount > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (amount < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

const numericCellClass = 'p-1 align-middle'
const numericInnerClass = 'flex h-9 w-full items-center justify-end px-3 text-sm tabular-nums'
const assignedColClass = 'w-[8.5rem]'
const moneyColClass = 'w-[8.5rem]'

function NumericAmount(props: {
  amount: number
  className?: string
  emphasis?: boolean
}) {
  return (
    <div className={cn(numericInnerClass, props.emphasis && 'font-medium', props.className)}>
      {formatMoney(props.amount)}
    </div>
  )
}

export function BudgetMonthTable(props: BudgetMonthTableProps) {
  const { snapshot } = props
  const { t } = useAppTranslation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const readyToAssign = snapshot.summary.readyToAssign

  const toggleGroup = (groupId: string) => {
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'rounded-xl border px-6 py-5 sm:px-8 sm:py-6',
          readyToAssignBannerClass(readyToAssign),
        )}
      >
        <p className="text-sm font-medium text-muted-foreground">{t('custom:frontend:budgets:readyToAssign')}</p>
        <p className={cn('mt-1 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl', readyToAssignAmountClass(readyToAssign))}>
          {formatMoney(readyToAssign)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t('custom:frontend:budgets:readyToAssignHint')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">{t('custom:frontend:budgets:categoryColumn')}</TableHead>
                  <TableHead className={cn(assignedColClass, 'pr-4 text-right')}>
                    {t('custom:frontend:budgets:assignedColumn')}
                  </TableHead>
                  <TableHead className={cn(moneyColClass, 'pr-4 text-right')}>
                    {t('custom:frontend:budgets:activityColumn')}
                  </TableHead>
                  <TableHead className={cn(moneyColClass, 'pr-4 text-right')}>
                    {t('custom:frontend:budgets:availableColumn')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.groups.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      {t('custom:frontend:budgets:emptySpendingGroups')}
                    </TableCell>
                  </TableRow>
                ) : (
                  snapshot.groups.map((group) => {
                    const isCollapsed = collapsed[group.id] ?? false

                    return (
                      <Fragment key={group.id}>
                        <TableRow className="bg-muted/30 hover:bg-muted/40">
                          <TableCell className="font-medium">
                            <button
                              className="flex w-full items-center gap-2 text-left"
                              onClick={() => toggleGroup(group.id)}
                              type="button"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="size-4 shrink-0" />
                              ) : (
                                <ChevronDown className="size-4 shrink-0" />
                              )}
                              <span>{group.name}</span>
                              <Badge className="ml-1 font-normal" variant="outline">
                                {t(`custom:fields:categoryGroups:kind:${group.kind}`)}
                              </Badge>
                            </button>
                          </TableCell>
                          <TableCell className={cn(assignedColClass, numericCellClass)}>
                            <NumericAmount amount={group.assignedTotal} emphasis className="text-foreground" />
                          </TableCell>
                          <TableCell className={cn(moneyColClass, numericCellClass)}>
                            <NumericAmount
                              amount={group.activityTotal}
                              className={activityClassName(
                                group.activityTotal,
                                groupActivityKind(group.kind),
                              )}
                              emphasis
                            />
                          </TableCell>
                          <TableCell className={cn(moneyColClass, numericCellClass)}>
                            <NumericAmount
                              amount={group.availableTotal}
                              className={availableClassName(group.availableTotal)}
                              emphasis
                            />
                          </TableCell>
                        </TableRow>

                        {!isCollapsed
                          ? group.categories.map((category) => (
                              <TableRow key={category.id}>
                                <TableCell className="pl-10">
                                  <Link className="hover:underline" href={category.transactionsHref}>
                                    {category.label}
                                  </Link>
                                </TableCell>
                                <TableCell className={cn(assignedColClass, numericCellClass)}>
                                  <BudgetAssignedCell
                                    assigned={category.assigned}
                                    budgetId={snapshot.budgetId}
                                    categoryId={category.id}
                                    month={snapshot.month}
                                  />
                                </TableCell>
                                <TableCell className={cn(moneyColClass, numericCellClass)}>
                                  <NumericAmount
                                    amount={category.activity}
                                    className={activityClassName(
                                      category.activity,
                                      categoryActivityKind(category.purpose),
                                    )}
                                  />
                                </TableCell>
                                <TableCell className={cn(moneyColClass, numericCellClass)}>
                                  <NumericAmount
                                    amount={category.available}
                                    className={availableClassName(category.available)}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          : null}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{snapshot.monthLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('custom:frontend:budgets:incomeActivity')}</span>
                <span className={cn('font-medium tabular-nums', activityClassName(snapshot.summary.incomeActivity, 'income'))}>
                  {formatMoney(snapshot.summary.incomeActivity)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('custom:frontend:budgets:expenseActivity')}</span>
                <span className={cn('font-medium tabular-nums', activityClassName(snapshot.summary.expenseActivity, 'expense'))}>
                  {formatMoney(snapshot.summary.expenseActivity)}
                </span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between gap-2">
                <span className="font-medium">{t('custom:frontend:budgets:netActivity')}</span>
                <span className={cn('font-semibold tabular-nums', activityClassName(snapshot.summary.net, 'net'))}>
                  {formatMoney(snapshot.summary.net)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {t('custom:frontend:budgets:sidebarHint')}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
