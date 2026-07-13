import Link from 'next/link'
import { Suspense } from 'react'

import { BudgetFormDialog } from '@/app/(frontend)/_components/budget-form-dialog'
import { PayloadFilterBar } from '@/app/(frontend)/_components/payload-filter-bar'
import { budgetFilterFields } from '@/lib/filters/fields'
import { parseFiltersParam } from '@/lib/filters/parse'
import { findFilteredBudgets } from '@/lib/frontend/budget-query.server'
import { getAppPayload } from '@/lib/frontend/payload.server'
import type { Budget, User } from '@/types'
import { getRequestI18n } from '@/utils/i18n.server'
import { Badge } from '@dappermountain/ui/components/badge'
import { Button } from '@dappermountain/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dappermountain/ui/components/table'
import { ArrowRight } from '@dappermountain/ui/icons'

export type BudgetsViewProps = {
  budgets: Budget[]
}

export async function BudgetsViewLoader(props: {
  user: User
  workspaceId: string
  filtersRaw?: string
}) {
  const payload = await getAppPayload()
  const clauses = parseFiltersParam(props.filtersRaw)
  const result = await findFilteredBudgets(payload, {
    user: props.user,
    workspaceId: props.workspaceId,
    clauses,
  })

  return <BudgetsView budgets={result.docs} />
}

export async function BudgetsView(props: BudgetsViewProps) {
  const { budgets } = props
  const { t } = await getRequestI18n()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild className="-ml-2 mb-2" size="sm" variant="ghost">
            <Link href="/budgets">{t('custom:frontend:budgets:backToMonthView')}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('custom:frontend:budgets:manageTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('custom:collections:budgets:description')}</p>
        </div>
        <BudgetFormDialog />
      </div>

      <Suspense fallback={null}>
        <PayloadFilterBar fields={budgetFilterFields} />
      </Suspense>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('custom:frontend:filters:fields:name')}</TableHead>
              <TableHead>{t('custom:frontend:budgets:defaultColumn')}</TableHead>
              <TableHead className="w-[8rem]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={3}>
                  {t('custom:frontend:budgets:empty')}
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">{budget.name}</TableCell>
                  <TableCell>
                    {budget.isDefault ? (
                      <Badge variant="secondary">{t('custom:frontend:budgets:defaultBadge')}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/budgets/${budget.id}`}>
                        {t('custom:frontend:budgets:openBudget')}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
