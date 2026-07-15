'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@dappermountain/ui/components/dropdown-menu'
import { cn } from '@dappermountain/ui/lib/utils'

import type { Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export const TRANSACTION_STATUSES = ['pending', 'posted'] as const

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

const STATUS_DOT_CLASS: Record<TransactionStatus, string> = {
  pending: 'bg-amber-600 dark:bg-amber-400',
  posted: 'bg-emerald-600 dark:bg-emerald-400',
}

const STATUS_CHIP_CLASS: Record<TransactionStatus, string> = {
  pending:
    'border-amber-500/35 bg-amber-500/10 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100',
  posted:
    'border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100',
}

function asStatus(status: Transaction['status']): TransactionStatus {
  return status === 'posted' ? 'posted' : 'pending'
}

function StatusChipFace(props: {
  status: TransactionStatus
  className?: string
}) {
  const { status, className } = props
  const { t } = useAppTranslation()

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        STATUS_CHIP_CLASS[status],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT_CLASS[status])} />
      {t(`custom:fields:transactions:status:${status}`)}
    </span>
  )
}

export type TransactionStatusDotProps = {
  status: Transaction['status']
  className?: string
}

/** Compact status cue for the register (color only). */
export function TransactionStatusDot(props: TransactionStatusDotProps) {
  const { status, className } = props
  const { t } = useAppTranslation()
  const resolved = asStatus(status)

  return (
    <span
      aria-label={t(`custom:fields:transactions:status:${resolved}`)}
      className={cn(
        'inline-flex size-1.5 shrink-0 rounded-full',
        STATUS_DOT_CLASS[resolved],
        className,
      )}
      title={t(`custom:fields:transactions:status:${resolved}`)}
    />
  )
}

export type TransactionStatusChipProps = {
  status: Transaction['status']
  className?: string
  disabled?: boolean
  onStatusChange?: (status: TransactionStatus) => void
}

/**
 * Small clickable status chip. When `onStatusChange` is set, opens a compact
 * chip menu (edit dialog). Without a handler it is display-only.
 */
export function TransactionStatusChip(props: TransactionStatusChipProps) {
  const { status, className, disabled, onStatusChange } = props
  const { t } = useAppTranslation()
  const resolved = asStatus(status)

  if (!onStatusChange) {
    return <StatusChipFace className={className} status={resolved} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          aria-label={t('custom:frontend:transactions:statusLabel')}
          className={cn(
            'inline-flex rounded-full outline-none transition-opacity',
            'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/40',
            'disabled:pointer-events-none disabled:opacity-50',
            className,
          )}
          disabled={disabled}
          type="button"
        >
          <StatusChipFace status={resolved} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-0 p-1">
        {TRANSACTION_STATUSES.map((value) => (
          <DropdownMenuItem
            className="cursor-pointer rounded-md p-1 focus:bg-muted"
            key={value}
            onSelect={() => {
              if (value !== resolved) onStatusChange(value)
            }}
          >
            <StatusChipFace status={value} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
