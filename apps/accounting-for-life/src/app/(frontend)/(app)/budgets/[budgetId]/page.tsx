import { redirect } from 'next/navigation'

import { BudgetMonthViewLoader } from '@/app/(frontend)/_components/budget-month-view'
import { formatBudgetMonthParam, parseBudgetMonth } from '@/lib/frontend/budget-month.types'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function BudgetMonthPage(props: {
  params: Promise<{ budgetId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { budgetId } = await props.params
  const searchParams = await props.searchParams
  const { user, headers } = await requireAppUser(`/budgets/${budgetId}`)
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  const month = parseBudgetMonth(searchParams.month)

  return (
    <BudgetMonthViewLoader
      budgetId={budgetId}
      monthRaw={searchParams.month ?? formatBudgetMonthParam(month)}
      user={user}
      workspaceId={workspace.id}
    />
  )
}
