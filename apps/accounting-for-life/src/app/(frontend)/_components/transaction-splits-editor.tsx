'use client'

import { useState } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import { Plus, Trash2 } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { PayeePicker } from '@/app/(frontend)/_components/payee-picker'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import {
  collapseToSingleCategory,
  isMultiSplitTransaction,
  newSplitDraft,
  newTransferSplitDraft,
  removeSplitDraft,
  splitAllocationRemaining,
  splitAmountFromPercent,
  splitIsTransfer,
  splitPercentOfTotal,
  transactionTotalMagnitude,
  type SplitDraft,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import {
  formatUnitAmount,
  resolveUnitForAccount,
  unitsByIdFromDocs,
} from '@/lib/frontend/format-unit-amount'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import {
  findAccount,
  interpolateTemplate,
  isPayeeTransferId,
} from '@/lib/frontend/transaction-payee'
import type { Account, Unit } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

/** Allocate one payment total across category / transfer rows (inline register popover). */
export type TransactionSplitsEditorProps = {
  state: TransactionSplitFormState
  onChange: (state: TransactionSplitFormState) => void
  accounts: Account[]
  budgetId?: string
  categoryOptions: RelationshipFilterOption[]
  payeeOptions?: string[]
  disabled?: boolean
  onCollapsedToRegular?: (categoryId: string) => void
  preferredCategoryId?: string
  units?: Unit[]
}

type SplitAllocationMode = 'amount' | 'percent'

export function TransactionSplitsEditor(props: TransactionSplitsEditorProps) {
  const {
    state,
    onChange,
    accounts,
    budgetId,
    categoryOptions,
    payeeOptions = [],
    disabled,
    onCollapsedToRegular,
    preferredCategoryId = '',
    units = [],
  } = props
  const { t } = useAppTranslation()
  const [allocationMode, setAllocationMode] = useState<SplitAllocationMode>('amount')

  const remaining = splitAllocationRemaining(state)
  const balanced = Math.abs(remaining) < 1e-9
  const showCollapse = isMultiSplitTransaction(state.splits)
  const totalMagnitude = transactionTotalMagnitude(state.totalAmount)
  const unitsById = unitsByIdFromDocs(units)
  const paymentUnit = resolveUnitForAccount(
    findAccount(accounts, state.paymentAccount),
    unitsById,
  )
  const formatPaymentAmount = (amount: number) => formatUnitAmount(amount, paymentUnit)

  const updateSplit = (index: number, patch: Partial<SplitDraft>) => {
    onChange({
      ...state,
      splits: state.splits.map((split, splitIndex) =>
        splitIndex === index ? { ...split, ...patch } : split,
      ),
    })
  }

  const addSplit = () => {
    onChange({
      ...state,
      splits: [...state.splits, newSplitDraft()],
    })
  }

  const addTransferSplit = () => {
    onChange({
      ...state,
      splits: [...state.splits, newTransferSplitDraft()],
    })
  }

  const removeSplit = (index: number) => {
    onChange({
      ...state,
      splits: removeSplitDraft(state.splits, index),
    })
  }

  const collapseToRegular = () => {
    const collapsed = collapseToSingleCategory(state)
    onChange(collapsed)
    onCollapsedToRegular?.(preferredCategoryId)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('custom:frontend:transactions:splitDescription')}
      </p>

      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {t('custom:frontend:transactions:transactionTotal')}
        </span>
        <span className="font-medium tabular-nums">
          {formatPaymentAmount(Number(state.totalAmount) || 0)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('custom:frontend:transactions:splits')}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <div
            aria-label={t('custom:frontend:transactions:splitAllocationMode')}
            className="inline-flex rounded-md border bg-muted/30 p-0.5"
            role="group"
          >
            {(['amount', 'percent'] as const).map((mode) => (
              <button
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  allocationMode === mode
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                disabled={disabled}
                key={mode}
                onClick={() => setAllocationMode(mode)}
                type="button"
              >
                {mode === 'amount'
                  ? t('custom:frontend:transactions:splitByAmount')
                  : t('custom:frontend:transactions:splitByPercent')}
              </button>
            ))}
          </div>

          <span
            className={cn(
              'text-xs tabular-nums',
              balanced ? 'text-muted-foreground' : 'font-medium text-destructive',
            )}
          >
            {balanced
              ? t('custom:frontend:transactions:balanced')
              : `${t('custom:frontend:transactions:leftToAllocate')} ${formatPaymentAmount(remaining)}`}
          </span>
        </div>
      </div>

      {state.splits.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t('custom:frontend:transactions:noSplitsYet')}
        </p>
      ) : null}

      {state.splits.map((split, index) => (
        <div className="grid gap-3 rounded-lg border p-3" key={split.key}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {interpolateTemplate(t('custom:frontend:transactions:splitLine'), {
                index: String(index + 1),
              })}
            </span>
            <Button
              aria-label={t('custom:frontend:transactions:removeSplit')}
              disabled={disabled}
              onClick={() => removeSplit(index)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:frontend:filters:fields:payee')}</Label>
            <PayeePicker
              accounts={accounts}
              budgetId={budgetId}
              disabled={disabled}
              onCommit={(payee) =>
                updateSplit(index, {
                  payee,
                  ...(isPayeeTransferId(payee) ? { category: '' } : {}),
                })
              }
              onValueChange={(payee) =>
                updateSplit(index, {
                  payee,
                  ...(isPayeeTransferId(payee) ? { category: '' } : {}),
                })
              }
              payeeOptions={payeeOptions}
              placeholder={t('custom:frontend:transactions:payeePlaceholder')}
              sourceAccountId={state.paymentAccount}
              value={split.payee}
            />
          </div>

          {!splitIsTransfer(split) ? (
            <div className="grid gap-2">
              <Label>{t('custom:frontend:filters:fields:category')}</Label>
              <GroupedPicker
                disabled={disabled}
                onValueChange={(value) => updateSplit(index, { category: value })}
                options={categoryOptions}
                placeholder={t('custom:frontend:filters:selectValue')}
                searchPlaceholder={t('custom:frontend:filters:searchCategories')}
                value={split.category}
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>
              {allocationMode === 'amount'
                ? t('custom:frontend:transactions:splitAmount')
                : t('custom:frontend:transactions:splitPercent')}
            </Label>
            {allocationMode === 'amount' ? (
              <Input
                disabled={disabled}
                min="0"
                onChange={(event) => updateSplit(index, { amount: event.target.value })}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={split.amount}
              />
            ) : (
              <Input
                disabled={disabled || totalMagnitude <= 0}
                max="100"
                min="0"
                onChange={(event) =>
                  updateSplit(index, {
                    amount: splitAmountFromPercent(event.target.value, state.totalAmount),
                  })
                }
                placeholder="0"
                step="0.01"
                type="number"
                value={splitPercentOfTotal(split.amount, state.totalAmount)}
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:fields:transactions:entryNotes')}</Label>
            <Input
              disabled={disabled}
              onChange={(event) => updateSplit(index, { notes: event.target.value })}
              placeholder={t('custom:fields:transactions:entryNotesPlaceholder')}
              value={split.notes}
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={addSplit} size="sm" type="button" variant="outline">
          <Plus className="size-4" />
          {t('custom:frontend:transactions:addCategorySplit')}
        </Button>
        <Button
          disabled={disabled}
          onClick={addTransferSplit}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus className="size-4" />
          {t('custom:frontend:transactions:addTransferSplit')}
        </Button>

        {showCollapse ? (
          <Button
            disabled={disabled}
            onClick={collapseToRegular}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t('custom:frontend:transactions:backToRegularTransaction')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
