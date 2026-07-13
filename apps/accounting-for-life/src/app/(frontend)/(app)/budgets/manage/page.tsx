import { redirect } from 'next/navigation'

import { BudgetsViewLoader } from '@/app/(frontend)/_components/budgets-view'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function BudgetsManagePage(props: {
  searchParams: Promise<{ filters?: string }>
}) {
  const searchParams = await props.searchParams
  const { user, headers } = await requireAppUser('/budgets/manage')
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  return (
    <BudgetsViewLoader
      filtersRaw={searchParams.filters}
      user={user}
      workspaceId={workspace.id}
    />
  )
}
