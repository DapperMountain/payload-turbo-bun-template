import { redirect } from 'next/navigation'

import { TransactionsViewLoader } from '@/app/(frontend)/_components/transactions-view'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveBudget } from '@/lib/frontend/budget.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function TransactionsPage(props: {
  searchParams: Promise<{ filters?: string }>
}) {
  const searchParams = await props.searchParams
  const { user, headers } = await requireAppUser('/transactions')
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  const activeBudget = await resolveActiveBudget(user, workspace.id, headers)

  return (
    <TransactionsViewLoader
      activeBudgetId={activeBudget?.id ?? null}
      filtersRaw={searchParams.filters}
      user={user}
      workspaceId={workspace.id}
    />
  )
}
