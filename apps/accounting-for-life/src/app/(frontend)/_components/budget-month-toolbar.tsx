'use client'

import Link from 'next/link'
import { Button } from '@dappermountain/ui/components/button'
import { ChevronLeft, ChevronRight } from '@dappermountain/ui/icons'

import { useAppTranslation } from '@/utils/i18n.client'

export type BudgetMonthToolbarProps = {
  budgetId: string
  monthLabel: string
  prevMonth: string
  nextMonth: string
}

export function BudgetMonthToolbar(props: BudgetMonthToolbarProps) {
  const { budgetId, monthLabel, prevMonth, nextMonth } = props
  const { t } = useAppTranslation()

  const monthHref = (month: string) => `/budgets/${budgetId}?month=${month}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button asChild size="icon" variant="ghost">
          <Link aria-label={t('custom:frontend:budgets:previousMonth')} href={monthHref(prevMonth)}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <span className="min-w-[6.5rem] text-center text-sm font-medium">{monthLabel}</span>
        <Button asChild size="icon" variant="ghost">
          <Link aria-label={t('custom:frontend:budgets:nextMonth')} href={monthHref(nextMonth)}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
        <Button asChild className="h-8 text-xs" size="sm" variant="outline">
          <Link href={monthHref(new Date().toISOString().slice(0, 7))}>
            {t('custom:frontend:budgets:thisMonth')}
          </Link>
        </Button>
      </div>

      <Button asChild className="h-8" size="sm" variant="outline">
        <Link href="/budgets/manage">{t('custom:frontend:budgets:manage')}</Link>
      </Button>
    </div>
  )
}
