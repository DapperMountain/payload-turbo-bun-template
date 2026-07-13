import { redirect } from 'next/navigation'

import { AccountDetailViewLoader } from '@/app/(frontend)/_components/account-detail-view'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function AccountDetailPage(props: {
  params: Promise<{ accountId: string }>
  searchParams: Promise<{ filters?: string }>
}) {
  const { accountId } = await props.params
  const searchParams = await props.searchParams
  const { user, headers } = await requireAppUser(`/accounts/${accountId}`)
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  return (
    <AccountDetailViewLoader
      accountId={accountId}
      filtersRaw={searchParams.filters}
      user={user}
      workspaceId={workspace.id}
    />
  )
}
