'use client'

import { useEffect, useState } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@dappermountain/ui/components/popover'
import { Separator } from '@dappermountain/ui/components/separator'
import { cn } from '@dappermountain/ui/lib/utils'
import { Calendar, Clock } from 'lucide-react'

import {
  combineTransactionDateTime,
  formatTransactionDateDisplay,
  nowTransactionDateTime,
  transactionDatePart,
  transactionTimePart,
} from '@/lib/frontend/transaction-datetime'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionDateTimePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Fires when the popover closes or the user picks "now" — use for persisting. */
  onCommit?: (value: string) => void
  disabled?: boolean
  /** Compact trigger for register rows. */
  variant?: 'default' | 'compact'
  /** Quiet trigger that looks like text until focused/open. */
  appearance?: 'outline' | 'plain'
  className?: string
}

export function TransactionDateTimePicker(props: TransactionDateTimePickerProps) {
  const {
    id,
    value,
    onChange,
    onCommit,
    disabled,
    variant = 'default',
    appearance = 'outline',
    className,
  } = props
  const { t } = useAppTranslation()
  const [open, setOpen] = useState(false)
  const [draftDate, setDraftDate] = useState(() => transactionDatePart(value))
  const [draftTime, setDraftTime] = useState(() => transactionTimePart(value))

  useEffect(() => {
    if (!open) {
      setDraftDate(transactionDatePart(value))
      setDraftTime(transactionTimePart(value))
    }
  }, [open, value])

  const previewValue = (datePart: string, timePart: string) => {
    if (!datePart) return
    onChange(combineTransactionDateTime(datePart, timePart))
  }

  const commitValue = (datePart: string, timePart: string) => {
    if (!datePart) return
    const combined = combineTransactionDateTime(datePart, timePart)
    onChange(combined)
    onCommit?.(combined)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && open) {
      commitValue(draftDate, draftTime)
    }
    setOpen(next)
  }

  const hasDate = Boolean(value && transactionDatePart(value))
  const display = hasDate
    ? formatTransactionDateDisplay(value)
    : t('custom:frontend:transactions:pickDateTime')

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            'justify-start gap-2 font-normal',
            variant === 'default' && 'w-full',
            variant === 'compact' && 'h-7 min-w-0 px-1.5 text-left',
            appearance === 'plain' &&
              'border-transparent bg-transparent px-1 shadow-none hover:bg-muted/50',
            !hasDate && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
          id={id}
          type="button"
          variant={appearance === 'plain' ? 'ghost' : 'outline'}
        >
          <Calendar className="size-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="space-y-3 p-3">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground" htmlFor={`${id ?? 'tx'}-date`}>
              {t('custom:frontend:filters:fields:date')}
            </Label>
            <Input
              disabled={disabled}
              id={`${id ?? 'tx'}-date`}
              onChange={(event) => {
                const nextDate = event.target.value
                setDraftDate(nextDate)
                previewValue(nextDate, draftTime)
              }}
              type="date"
              value={draftDate}
            />
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground" htmlFor={`${id ?? 'tx'}-time`}>
              {t('custom:frontend:filters:fields:time')}
            </Label>
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Input
                className="w-[9rem]"
                disabled={disabled}
                id={`${id ?? 'tx'}-time`}
                onChange={(event) => {
                  const nextTime = event.target.value
                  setDraftTime(nextTime)
                  previewValue(draftDate, nextTime)
                }}
                step={60}
                type="time"
                value={draftTime}
              />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={disabled}
            onClick={() => {
              const now = nowTransactionDateTime()
              const nextDate = transactionDatePart(now)
              const nextTime = transactionTimePart(now)
              setDraftDate(nextDate)
              setDraftTime(nextTime)
              commitValue(nextDate, nextTime)
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {t('custom:frontend:transactions:setToNow')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function TransactionDateTimeReadonly(props: {
  value: string | null | undefined
  className?: string
}) {
  const { value, className } = props
  const dateLabel = formatTransactionDateDisplay(value)
  if (!dateLabel) {
    return <span className={cn('text-muted-foreground', className)}>—</span>
  }

  return <span className={cn('text-muted-foreground', className)}>{dateLabel}</span>
}
