import config from '@payload-config'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/app/(frontend)/_components/app-shell'
import { requireAppUser } from '@/lib/frontend/auth.server'
import { listWorkspaceBudgets, resolveActiveBudget } from '@/lib/frontend/budget.server'
import {
  listUserWorkspaces,
  resolveActiveWorkspace,
  workspaceLabel,
} from '@/lib/frontend/workspace.server'

export default async function AppLayout(props: { children: ReactNode; modal: ReactNode }) {
  const { children, modal } = props
  const { user, headers } = await requireAppUser()
  const payloadConfig = await config
  const workspace = await resolveActiveWorkspace(user, headers)
  const workspaces = await listUserWorkspaces(user)

  if (!workspace && workspaces.length === 0) {
    redirect('/')
  }

  const budgets = workspace ? await listWorkspaceBudgets(user, workspace.id) : []
  const activeBudget = workspace ? await resolveActiveBudget(user, workspace.id, headers) : null

  return (
    <AppShell
      activeBudgetId={activeBudget?.id ?? null}
      activeWorkspaceId={workspace?.id ?? null}
      adminHref={payloadConfig.routes.admin}
      budgets={budgets.map((b) => ({ id: b.id, name: b.name }))}
      userEmail={user.email}
      workspaces={workspaces.map((w) => ({ id: w.id, name: workspaceLabel(w) }))}
    >
      {children}
      {modal}
    </AppShell>
  )
}
