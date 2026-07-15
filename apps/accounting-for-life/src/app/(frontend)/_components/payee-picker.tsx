'use client'

import { useMemo, useRef, useState } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Input } from '@dappermountain/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@dappermountain/ui/components/popover'
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
import type { AmountDirection } from '@/lib/frontend/transaction-amount-direction'
import type { Account, Transaction } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type PayeePickerProps = {
  accounts: Account[]
  budgetId?: string
  sourceAccountId?: string
  /** When set, inbound/outbound uses posted legs for the viewing account. */
  transaction?: Transaction | null
  /**
   * Payment-account amount direction. Inflow flips transfer arrows relative to
   * the structural payee destination (debit vs credit toggle).
   */
  amountDirection?: AmountDirection | null
  payeeOptions?: string[]
  value: string
  /** Live draft while typing in search (optional — use for form state). */
  onValueChange?: (value: string) => void
  /** Finalized value: list selection, Enter, or “add payee”. */
  onCommit: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
  /** Quiet field that looks like text until open. */
  appearance?: 'input' | 'plain'
}

export function PayeePicker(props: PayeePickerProps) {
  const {
    accounts,
    budgetId,
    sourceAccountId,
    transaction,
    amountDirection,
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
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

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
    () => buildPayeeMerchantOptions(payeeOptions, query),
    [payeeOptions, query],
  )

  const trimmedQuery = query.trim()

  const filteredTransfers = useMemo(() => {
    const q = trimmedQuery.toLowerCase()
    if (!q) return transferOptions
    return transferOptions.filter((option) => option.label.toLowerCase().includes(q))
  }, [transferOptions, trimmedQuery])

  const showAddNew =
    trimmedQuery.length > 0 &&
    !isPayeeTransferId(trimmedQuery) &&
    !merchantOptions.some(
      (option) => option.label.toLowerCase() === trimmedQuery.toLowerCase(),
    ) &&
    !transferOptions.some(
      (option) => option.label.toLowerCase() === trimmedQuery.toLowerCase(),
    )

  const transferPresentation = useMemo(() => {
    if (!isPayeeTransferId(value)) return null
    const pair = resolveTransferPair(accounts, {
      transaction,
      payeeValue: value,
      paymentAccountId: sourceAccountId,
    })
    if (!pair) return null
    return transferPayeePresentation(
      pair,
      sourceAccountId ?? pair.source.id,
      amountDirection,
    )
  }, [accounts, amountDirection, sourceAccountId, transaction, value])

  const commitValue = (next: string) => {
    onCommit(next)
    onValueChange?.(next)
    setOpen(false)
    setQuery('')
  }

  const selectTransfer = (accountId: string) => {
    commitValue(toPayeeTransferId(accountId))
  }

  const selectMerchant = (memo: string) => {
    commitValue(memo)
  }

  const plain = appearance === 'plain'
  const triggerPlaceholder = placeholder ?? t('custom:frontend:transactions:payeePlaceholder')
  const hasListItems =
    showAddNew || merchantOptions.length > 0 || filteredTransfers.length > 0

  const merchantLabel =
    !isPayeeTransferId(value) && value.trim() ? value : null

  return (
    <Popover
      modal={false}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
      open={open && !disabled}
    >
      <PopoverTrigger asChild>
        <Button
          className={cn(
            'justify-between font-normal',
            plain &&
              'h-7 w-auto border-transparent bg-transparent px-1.5 shadow-none hover:bg-muted/50',
            !plain && 'w-full',
            className,
          )}
          disabled={disabled}
          id={id}
          type="button"
          variant={plain ? 'ghost' : 'outline'}
        >
          <span
            className={cn(
              'min-w-0 truncate text-left',
              !transferPresentation && !merchantLabel && 'text-muted-foreground',
            )}
          >
            {transferPresentation ? (
              <TransferPayeeLabel className="min-w-0" presentation={transferPresentation} />
            ) : (
              (merchantLabel ?? triggerPlaceholder)
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          window.requestAnimationFrame(() => searchRef.current?.focus())
        }}
      >
        <div className="border-b p-2">
          <Input
            className="h-8"
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (trimmedQuery) commitValue(trimmedQuery)
              }
              if (event.key === 'Escape') {
                setOpen(false)
                setQuery('')
              }
            }}
            placeholder={t('custom:frontend:transactions:searchPayees')}
            ref={searchRef}
            value={query}
          />
        </div>
        <div
          className="max-h-64 overflow-y-auto overscroll-contain p-1"
          onPointerDown={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
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
                    onClick={() => commitValue(trimmedQuery)}
                    type="button"
                  >
                    {interpolateNamedTemplate(
                      t('custom:frontend:transactions:addPayeeNamed'),
                      trimmedQuery,
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
