import { redirect } from 'next/navigation'

import { DashboardView } from '@/app/(frontend)/_components/dashboard-view'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { resolveActiveWorkspace } from '@/lib/frontend/workspace.server'

export default async function DashboardPage() {
  const { user, headers } = await requireAppUser('/dashboard')
  const workspace = await resolveActiveWorkspace(user, headers)

  if (!workspace) {
    redirect('/')
  }

  return <DashboardView user={user} workspaceId={workspace.id} />
}
