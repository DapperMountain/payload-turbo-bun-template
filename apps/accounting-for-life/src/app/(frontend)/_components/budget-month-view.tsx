import { notFound } from 'next/navigation'

import { BudgetMonthTable } from '@/app/(frontend)/_components/budget-month-table'
import { BudgetMonthToolbar } from '@/app/(frontend)/_components/budget-month-toolbar'
import { parseBudgetMonth } from '@/lib/frontend/budget-month.types'
import { getBudgetMonthSnapshot } from '@/lib/frontend/budget-month.server'
import { getAppPayload } from '@/lib/frontend/payload.server'
import type { User } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

export async function BudgetMonthViewLoader(props: {
  user: User
  workspaceId: string
  budgetId: string
  monthRaw?: string
}) {
  const payload = await getAppPayload()
  const month = parseBudgetMonth(props.monthRaw)

  let budget
  try {
    budget = await payload.findByID({
      collection: 'budgets',
      id: props.budgetId,
      depth: 0,
      user: props.user,
      overrideAccess: false,
    })
  } catch {
    notFound()
  }

  const budgetWorkspaceId = budget.workspace ? getCollectionId(budget.workspace) : undefined
  if (budgetWorkspaceId !== props.workspaceId) {
    notFound()
  }

  const snapshot = await getBudgetMonthSnapshot(payload, {
    user: props.user,
    workspaceId: props.workspaceId,
    budgetId: budget.id,
    month,
  })

  return (
    <div className="space-y-6">
      <BudgetMonthToolbar
        budgetId={budget.id}
        monthLabel={snapshot.monthLabel}
        nextMonth={snapshot.nextMonth}
        prevMonth={snapshot.prevMonth}
      />
      <BudgetMonthTable snapshot={snapshot} />
    </div>
  )
}
