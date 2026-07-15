'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@dappermountain/ui/components/input'
import { Popover, PopoverContent, PopoverAnchor } from '@dappermountain/ui/components/popover'
import { ChevronDown } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { AccountLabel } from '@/app/(frontend)/_components/account-label'
import { TransferPayeeLabel } from '@/app/(frontend)/_components/transfer-payee-label'
import {
  buildPayeeMerchantOptions,
  buildPayeeTransferOptions,
  createPayeeLabelHelpers,
  findAccount,
  interpolateNamedTemplate,
  isPayeeTransferId,
  payeeTransferAccountId,
  resolveTransferPair,
  toPayeeTransferId,
  transferPayeePresentation,
} from '@/lib/frontend/transaction-payee'
import type { Account, Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type PayeePickerProps = {
  accounts: Account[]
  budgetId?: string
  sourceAccountId?: string
  /** When set, inbound/outbound uses posted legs for the viewing account. */
  transaction?: Transaction | null
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
  /** Quiet field that looks like text until focused. */
  appearance?: 'input' | 'plain'
}

export function PayeePicker(props: PayeePickerProps) {
  const {
    accounts,
    budgetId,
    sourceAccountId,
    transaction,
    payeeOptions = [],
    value,
    onValueChange,
    onCommit,
    disabled,
    className,
    placeholder,
    id,
    appearance = 'input',
  } = props
  const { t } = useAppTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')

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
    () => buildPayeeMerchantOptions(payeeOptions, focused ? draft : ''),
    [draft, focused, payeeOptions],
  )

  const trimmedDraft = draft.trim()
  const showAddNew =
    trimmedDraft.length > 0 &&
    !isPayeeTransferId(trimmedDraft) &&
    !merchantOptions.some(
      (option) => option.label.toLowerCase() === trimmedDraft.toLowerCase(),
    ) &&
    !transferOptions.some(
      (option) => option.label.toLowerCase() === trimmedDraft.toLowerCase(),
    )

  const filteredTransfers = useMemo(() => {
    const q = trimmedDraft.toLowerCase()
    if (!q || !focused) return transferOptions
    return transferOptions.filter((option) => option.label.toLowerCase().includes(q))
  }, [focused, transferOptions, trimmedDraft])

  const transferPresentation = useMemo(() => {
    if (!isPayeeTransferId(value)) return null
    const pair = resolveTransferPair(accounts, {
      transaction,
      payeeValue: value,
      paymentAccountId: sourceAccountId,
    })
    if (!pair) return null
    return transferPayeePresentation(pair, sourceAccountId ?? pair.source.id)
  }, [accounts, sourceAccountId, transaction, value])

  const showTransferChrome = Boolean(transferPresentation) && !focused

  const displayValue = focused
    ? draft
    : showTransferChrome
      ? ''
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

  const focusInput = () => {
    setFocused(true)
    setDraft(isPayeeTransferId(value) ? '' : value)
    setOpen(true)
    window.requestAnimationFrame(() => inputRef.current?.focus())
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

  const outline = appearance === 'input'

  return (
    <Popover
      modal={false}
      onOpenChange={(next) => {
        if (focused && !next) return
        setOpen(next)
      }}
      open={open && !disabled}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            'relative min-w-0',
            // Match GroupedPicker outline trigger (Account field in edit dialog).
            outline &&
              'flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs',
            className,
          )}
        >
          {showTransferChrome && transferPresentation ? (
            <button
              className={cn(
                'absolute inset-0 z-[1] flex min-w-0 items-center gap-2 text-left',
                outline
                  ? 'justify-between px-3'
                  : 'rounded-md px-1.5 hover:bg-muted/50',
              )}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                focusInput()
              }}
              type="button"
            >
              <TransferPayeeLabel className="min-w-0" presentation={transferPresentation} />
              {outline ? <ChevronDown className="size-4 shrink-0 opacity-50" /> : null}
            </button>
          ) : null}
          <Input
            aria-hidden={showTransferChrome || undefined}
            className={cn(
              'w-full',
              outline &&
                'h-full border-0 bg-transparent pr-8 shadow-none focus-visible:ring-0',
              appearance === 'plain' &&
                'h-7 border-transparent bg-transparent px-1.5 shadow-none hover:bg-muted/50 focus-visible:border-input focus-visible:bg-background',
              // Hide the field entirely while the transfer chrome is painted over it —
              // text-transparent still leaves the placeholder visible underneath.
              showTransferChrome && 'pointer-events-none opacity-0',
            )}
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
            placeholder={
              showTransferChrome
                ? undefined
                : (placeholder ?? t('custom:frontend:transactions:payeePlaceholder'))
            }
            ref={inputRef}
            tabIndex={showTransferChrome ? -1 : undefined}
            title={!focused && !showTransferChrome && value ? value : undefined}
            value={displayValue}
          />
          {outline && !showTransferChrome ? (
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 size-4 shrink-0 opacity-50"
            />
          ) : null}
        </div>
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
                        'flex w-full truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                        !isPayeeTransferId(value) && value === option.id && 'bg-accent',
                      )}
                      key={option.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectMerchant(option.label)}
                      title={option.label}
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
                  {filteredTransfers.map((option) => {
                    const destination = findAccount(accounts, payeeTransferAccountId(option.id))

                    return (
                      <button
                        className={cn(
                          'flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                          value === option.id && 'bg-accent',
                        )}
                        key={option.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectTransfer(payeeTransferAccountId(option.id))}
                        title={option.label}
                        type="button"
                      >
                        {destination ? (
                          <AccountLabel account={destination} name={option.label} />
                        ) : (
                          option.label
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
