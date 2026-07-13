'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Separator } from '@dappermountain/ui/components/separator'
import {
  ArrowUpRight,
  BookOpen,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Receipt,
  Wallet,
  X,
} from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { useAppTranslation } from '@/utils/i18n.client'

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden'

const SIDEBAR_STORAGE_KEY = 'afl-sidebar-mode'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'custom:frontend:nav:dashboard' as const },
  { href: '/budgets', icon: BookOpen, labelKey: 'custom:frontend:nav:budgets' as const },
  { href: '/accounts', icon: Wallet, labelKey: 'custom:frontend:nav:accounts' as const },
  { href: '/transactions', icon: Receipt, labelKey: 'custom:frontend:nav:transactions' as const },
]

export type AppSidebarProps = {
  adminHref: string
  mode: SidebarMode
  mobileOpen: boolean
  onCloseMobile: () => void
  onModeChange: (mode: SidebarMode) => void
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
}

function SidebarNav(props: {
  adminHref: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const { adminHref, collapsed, onNavigate } = props
  const pathname = usePathname()
  const { t } = useAppTranslation()

  return (
    <>
      <nav aria-label={t('custom:frontend:nav:navigation')} className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ href, icon: Icon, labelKey }) => {
          const isActive = isActivePath(pathname, href)

          return (
            <Button
              key={href}
              asChild
              className={cn(
                'w-full justify-start',
                collapsed && 'justify-center px-0',
                isActive && 'bg-accent text-accent-foreground',
              )}
              size={collapsed ? 'icon' : 'default'}
              title={collapsed ? t(labelKey) : undefined}
              variant="ghost"
            >
              <Link href={href} onClick={onNavigate}>
                <Icon className="size-4 shrink-0" />
                {!collapsed ? <span>{t(labelKey)}</span> : null}
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-2 p-2">
        <Separator />
        <Button
          asChild
          className={cn('w-full justify-start', collapsed && 'justify-center px-0')}
          size={collapsed ? 'icon' : 'default'}
          title={collapsed ? t('custom:frontend:nav:admin') : undefined}
          variant="ghost"
        >
          <a href={adminHref} onClick={onNavigate} rel="noopener noreferrer" target="_blank">
            <ArrowUpRight className="size-4 shrink-0" />
            {!collapsed ? <span>{t('custom:frontend:nav:admin')}</span> : null}
          </a>
        </Button>
      </div>
    </>
  )
}

function SidebarChrome(props: {
  adminHref: string
  collapsed: boolean
  mode: SidebarMode
  onCloseMobile?: () => void
  onModeChange: (mode: SidebarMode) => void
}) {
  const { adminHref, collapsed, mode, onCloseMobile, onModeChange } = props
  const { t } = useAppTranslation()

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-14 items-center border-b px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed ? (
          <Link className="truncate font-semibold tracking-tight" href="/dashboard" onClick={onCloseMobile}>
            {t('custom:frontend:appName')}
          </Link>
        ) : (
          <Link
            className="flex size-8 items-center justify-center rounded-md font-semibold"
            href="/dashboard"
            onClick={onCloseMobile}
            title={t('custom:frontend:appName')}
          >
            {t('custom:frontend:appName').slice(0, 1)}
          </Link>
        )}

        {onCloseMobile ? (
          <Button onClick={onCloseMobile} size="icon-sm" type="button" variant="ghost">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <SidebarNav adminHref={adminHref} collapsed={collapsed} onNavigate={onCloseMobile} />

      {!onCloseMobile ? (
        <div className="space-y-1 border-t p-2">
          <Button
            className={cn('w-full justify-start', collapsed && 'justify-center px-0')}
            onClick={() => onModeChange(mode === 'collapsed' ? 'expanded' : 'collapsed')}
            size={collapsed ? 'icon' : 'sm'}
            title={
              mode === 'collapsed'
                ? t('custom:frontend:nav:expandSidebar')
                : t('custom:frontend:nav:collapseSidebar')
            }
            type="button"
            variant="ghost"
          >
            <PanelLeft className="size-4 shrink-0" />
            {!collapsed ? (
              <span>
                {mode === 'collapsed'
                  ? t('custom:frontend:nav:expandSidebar')
                  : t('custom:frontend:nav:collapseSidebar')}
              </span>
            ) : null}
          </Button>

          <Button
            className={cn('w-full justify-start', collapsed && 'justify-center px-0')}
            onClick={() => onModeChange('hidden')}
            size={collapsed ? 'icon' : 'sm'}
            title={t('custom:frontend:nav:hideSidebar')}
            type="button"
            variant="ghost"
          >
            <PanelLeftClose className="size-4 shrink-0" />
            {!collapsed ? <span>{t('custom:frontend:nav:hideSidebar')}</span> : null}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function AppSidebar(props: AppSidebarProps) {
  const { adminHref, mode, mobileOpen, onCloseMobile, onModeChange } = props
  const { t } = useAppTranslation()
  const collapsed = mode === 'collapsed'

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label={t('custom:frontend:nav:hideSidebar')}
            className="absolute inset-0 bg-black/50"
            onClick={onCloseMobile}
            type="button"
          />
          <aside className="relative h-full w-56 border-r bg-background shadow-lg">
            <SidebarChrome
              adminHref={adminHref}
              collapsed={false}
              mode="expanded"
              onCloseMobile={onCloseMobile}
              onModeChange={onModeChange}
            />
          </aside>
        </div>
      ) : null}

      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-muted/20 transition-[width] duration-200 ease-in-out md:flex',
          mode === 'expanded' && 'w-56',
          mode === 'collapsed' && 'w-14',
          mode === 'hidden' && 'w-0 overflow-hidden border-r-0',
        )}
      >
        {mode !== 'hidden' ? (
          <SidebarChrome
            adminHref={adminHref}
            collapsed={collapsed}
            mode={mode}
            onModeChange={onModeChange}
          />
        ) : null}
      </aside>
    </>
  )
}

export function useSidebarMode(): {
  mode: SidebarMode
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  setMode: (mode: SidebarMode) => void
} {
  const [mode, setModeState] = useState<SidebarMode>('expanded')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === 'expanded' || stored === 'collapsed' || stored === 'hidden') {
      setModeState(stored)
    }
  }, [])

  const setMode = (next: SidebarMode) => {
    setModeState(next)
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next)
  }

  return { mode, mobileOpen, setMobileOpen, setMode }
}
