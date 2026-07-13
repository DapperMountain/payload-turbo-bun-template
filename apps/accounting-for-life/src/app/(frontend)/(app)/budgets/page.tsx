import { redirect } from 'next/navigation'

import { formatBudgetMonthParam, parseBudgetMonth } from '@/lib/frontend/budget-month.types'
import { listWorkspaceBudgets, resolveActiveBudget } from '@/lib/frontend/budget.server'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function BudgetsIndexPage() {
  const { user, headers } = await requireAppUser('/budgets')
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  const budgets = await listWorkspaceBudgets(user, workspace.id)

  if (!budgets.length) {
    redirect('/budgets/manage')
  }

  const activeBudget = await resolveActiveBudget(user, workspace.id, headers)
  const month = formatBudgetMonthParam(parseBudgetMonth())

  redirect(`/budgets/${activeBudget!.id}?month=${month}`)
}
