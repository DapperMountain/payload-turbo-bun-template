import { redirect } from 'next/navigation'

import { AccountsViewLoader } from '@/app/(frontend)/_components/accounts-view'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function AccountsPage(props: {
  searchParams: Promise<{ filters?: string }>
}) {
  const searchParams = await props.searchParams
  const { user, headers } = await requireAppUser('/accounts')
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  return (
    <AccountsViewLoader
      filtersRaw={searchParams.filters}
      user={user}
      workspaceId={workspace.id}
    />
  )
}
