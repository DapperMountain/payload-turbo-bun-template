'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@dappermountain/ui/components/input'
import { Popover, PopoverContent, PopoverAnchor } from '@dappermountain/ui/components/popover'
import { cn } from '@dappermountain/ui/lib/utils'

import {
  buildPayeeMerchantOptions,
  buildPayeeTransferOptions,
  createPayeeLabelHelpers,
  interpolateNamedTemplate,
  isPayeeTransferId,
  payeeDisplayLabel,
  payeeTransferAccountId,
  toPayeeTransferId,
} from '@/lib/frontend/transaction-payee'
import type { Account } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type PayeePickerProps = {
  accounts: Account[]
  budgetId?: string
  sourceAccountId?: string
  payeeOptions?: string[]
  value: string
  /** Live draft while typing (optional — use for form state). */
  onValueChange?: (value: string) => void
  /** Finalized value: blur, Enter, or list selection. */
  onCommit: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
}

export function PayeePicker(props: PayeePickerProps) {
  const {
    accounts,
    budgetId,
    sourceAccountId,
    payeeOptions = [],
    value,
    onValueChange,
    onCommit,
    disabled,
    className,
    placeholder,
    id,
  } = props
  const { t } = useAppTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)

  const labels = useMemo(
    () =>
      createPayeeLabelHelpers((key) =>
        t(key as 'custom:frontend:transactions:transferToAccountNamed'),
      ),
    [t],
  )

  const transferOptions = useMemo(
    () => buildPayeeTransferOptions(accounts, labels, budgetId, sourceAccountId),
    [accounts, budgetId, labels, sourceAccountId],
  )

  const merchantOptions = useMemo(
    () => buildPayeeMerchantOptions(payeeOptions, draft),
    [draft, payeeOptions],
  )

  const filteredTransfers = useMemo(() => {
    const q = draft.trim().toLowerCase()
    if (!q) return transferOptions
    return transferOptions.filter((option) => option.label.toLowerCase().includes(q))
  }, [draft, transferOptions])

  const trimmedDraft = draft.trim()
  const showAddNew =
    trimmedDraft.length > 0 &&
    !isPayeeTransferId(trimmedDraft) &&
    !merchantOptions.some(
      (option) => option.label.toLowerCase() === trimmedDraft.toLowerCase(),
    ) &&
    !filteredTransfers.some(
      (option) => option.label.toLowerCase() === trimmedDraft.toLowerCase(),
    )

  const displayValue = focused
    ? draft
    : isPayeeTransferId(value)
      ? payeeDisplayLabel(value, accounts, labels)
      : value

  const commitValue = (next: string) => {
    onCommit(next)
    onValueChange?.(next)
    setFocused(false)
    setDraft('')
    setOpen(false)
  }

  const updateDraft = (next: string) => {
    setDraft(next)
    onValueChange?.(next)
    setOpen(true)
  }

  useEffect(() => {
    if (!focused) {
      setDraft(isPayeeTransferId(value) ? '' : value)
    }
  }, [focused, value])

  const selectTransfer = (accountId: string) => {
    commitValue(toPayeeTransferId(accountId))
  }

  const selectMerchant = (memo: string) => {
    commitValue(memo)
  }

  const handleBlur = () => {
    window.setTimeout(() => {
      const active = document.activeElement
      if (active === inputRef.current) return
      if (active?.closest('[data-payee-picker-list]')) return

      if (focused) {
        const currentText = isPayeeTransferId(value) ? '' : value
        const next = draft.trim()
        if (next !== currentText) {
          commitValue(next)
        } else {
          setFocused(false)
          setDraft('')
          setOpen(false)
        }
      }
    }, 150)
  }

  const hasListItems =
    showAddNew || merchantOptions.length > 0 || filteredTransfers.length > 0

  return (
    <Popover
      onOpenChange={(next) => {
        if (focused && !next) return
        setOpen(next)
      }}
      open={open && !disabled}
    >
      <PopoverAnchor asChild>
        <Input
          className={cn(className)}
          disabled={disabled}
          id={id}
          onBlur={handleBlur}
          onChange={(event) => updateDraft(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onFocus={() => {
            setFocused(true)
            setDraft(isPayeeTransferId(value) ? '' : value)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitValue(trimmedDraft)
            }
            if (event.key === 'Escape') {
              setFocused(false)
              setDraft(isPayeeTransferId(value) ? '' : value)
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
          placeholder={placeholder ?? t('custom:frontend:transactions:payeePlaceholder')}
          ref={inputRef}
          value={displayValue}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        data-payee-picker-list
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('[data-slot="popover-anchor"]')) {
            event.preventDefault()
          }
        }}
      >
        <div
          className="max-h-64 overflow-y-auto overscroll-contain p-1"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {!hasListItems ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t('custom:frontend:filters:noMatches')}
            </p>
          ) : (
            <>
              {showAddNew ? (
                <div className="mb-1 border-b pb-1">
                  <button
                    className="flex w-full rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commitValue(trimmedDraft)}
                    type="button"
                  >
                    {interpolateNamedTemplate(
                      t('custom:frontend:transactions:addPayeeNamed'),
                      trimmedDraft,
                    )}
                  </button>
                </div>
              ) : null}

              {merchantOptions.length > 0 ? (
                <div className="mb-1">
                  <p className="sticky top-0 z-10 bg-popover px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t('custom:frontend:filters:fields:payee')}
                  </p>
                  {merchantOptions.map((option) => (
                    <button
                      className={cn(
                        'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                        !isPayeeTransferId(value) && value === option.id && 'bg-accent',
                      )}
                      key={option.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMerchant(option.label)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {filteredTransfers.length > 0 ? (
                <div>
                  <p className="sticky top-0 z-10 bg-popover px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t('custom:frontend:transactions:paymentsAndTransfers')}
                  </p>
                  {filteredTransfers.map((option) => (
                    <button
                      className={cn(
                        'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                        value === option.id && 'bg-accent',
                      )}
                      key={option.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectTransfer(payeeTransferAccountId(option.id))}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
