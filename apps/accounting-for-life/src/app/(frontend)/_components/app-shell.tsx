'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@dappermountain/ui/components/dropdown-menu'
import { Separator } from '@dappermountain/ui/components/separator'
import { BookOpen, ChevronDown, Menu, PanelLeft } from '@dappermountain/ui/icons'

import { AppSidebar, useSidebarMode } from '@/app/(frontend)/_components/app-sidebar'
import { LanguageSwitcher } from '@/app/(frontend)/_components/language-switcher'
import { switchWorkspaceAction } from '@/app/(frontend)/actions/workspace'
import { switchBudgetAction } from '@/app/(frontend)/actions/budgets'
import { useAppTranslation } from '@/utils/i18n.client'

export type AppShellProps = {
  adminHref: string
  children: React.ReactNode
  userEmail: string
  workspaces: { id: string; name: string }[]
  activeWorkspaceId: string | null
  budgets?: { id: string; name: string }[]
  activeBudgetId?: string | null
}

export function AppShell(props: AppShellProps) {
  const {
    adminHref,
    children,
    userEmail,
    workspaces,
    activeWorkspaceId,
    budgets = [],
    activeBudgetId,
  } = props
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useAppTranslation()
  const { mode, mobileOpen, setMobileOpen, setMode } = useSidebarMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [budgetMenuOpen, setBudgetMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)

  const pathnameBudgetId = pathname.match(/^\/budgets\/([^/]+)/)?.[1]
  const displayedBudgetId = pathnameBudgetId ?? activeBudgetId
  const activeBudget = budgets.find((budget) => budget.id === displayedBudgetId)

  const handleWorkspaceSelect = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      setMenuOpen(false)
      return
    }

    startTransition(async () => {
      const result = await switchWorkspaceAction(workspaceId)
      if (result.ok) {
        router.refresh()
      }
      setMenuOpen(false)
    })
  }

  const handleBudgetSelect = (budgetId: string) => {
    if (budgetId === displayedBudgetId) {
      setBudgetMenuOpen(false)
      return
    }

    startTransition(async () => {
      const result = await switchBudgetAction(budgetId)
      if (result.ok) {
        const month = new Date().toISOString().slice(0, 7)
        router.push(`/budgets/${budgetId}?month=${month}`)
        router.refresh()
      }
      setBudgetMenuOpen(false)
    })
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        adminHref={adminHref}
        mobileOpen={mobileOpen}
        mode={mode}
        onCloseMobile={() => setMobileOpen(false)}
        onModeChange={setMode}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center gap-2 px-4">
            <Button
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Menu className="size-4" />
            </Button>

            {mode === 'hidden' ? (
              <Button
                className="hidden md:inline-flex"
                onClick={() => setMode('expanded')}
                size="icon"
                title={t('custom:frontend:nav:showSidebar')}
                type="button"
                variant="ghost"
              >
                <PanelLeft className="size-4" />
              </Button>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              {budgets.length > 0 ? (
                <DropdownMenu onOpenChange={setBudgetMenuOpen} open={budgetMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={isPending} size="sm" type="button" variant="outline">
                      <BookOpen className="size-4" />
                      <span className="max-w-[10rem] truncate">
                        {activeBudget?.name ?? t('custom:frontend:budgets:selectorLabel')}
                      </span>
                      <ChevronDown className="size-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {budgets.map((budget) => (
                      <DropdownMenuItem
                        key={budget.id}
                        onSelect={(event) => {
                          event.preventDefault()
                          handleBudgetSelect(budget.id)
                        }}
                      >
                        {budget.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {workspaces.length > 0 ? (
                <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={isPending} size="sm" type="button" variant="outline">
                      <span className="max-w-[10rem] truncate">
                        {activeWorkspace?.name ?? t('custom:tenantSelector:label')}
                      </span>
                      <ChevronDown className="size-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {workspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace.id}
                        onSelect={(event) => {
                          event.preventDefault()
                          handleWorkspaceSelect(workspace.id)
                        }}
                      >
                        {workspace.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <LanguageSwitcher variant="header" />

              <span className="hidden text-sm text-muted-foreground lg:inline">{userEmail}</span>
            </div>
          </div>
          <Separator />
        </header>

        <main className="flex flex-1 flex-col px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  )
}
