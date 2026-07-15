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
  removeSplitDraft,
  splitAllocationRemaining,
  splitAmountFromPercent,
  splitIsTransfer,
  splitPercentOfTotal,
  transactionTotalMagnitude,
  type SplitDraft,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import { interpolateTemplate } from '@/lib/frontend/transaction-payee'
import type { Account } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

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
}

type SplitAllocationMode = 'amount' | 'percent'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

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
  } = props
  const { t } = useAppTranslation()
  const [allocationMode, setAllocationMode] = useState<SplitAllocationMode>('amount')

  const remaining = splitAllocationRemaining(state)
  const balanced = Math.abs(remaining) < 1e-9
  const showCollapse = isMultiSplitTransaction(state.splits)
  const totalMagnitude = transactionTotalMagnitude(state.totalAmount)

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
        <span className="text-muted-foreground">{t('custom:frontend:transactions:transactionTotal')}</span>
        <span className="font-medium tabular-nums">
          {formatMoney(Number(state.totalAmount) || 0)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('custom:frontend:transactions:splits')}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border bg-muted/30 p-0.5"
            role="group"
            aria-label={t('custom:frontend:transactions:splitAllocationMode')}
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
              : `${t('custom:frontend:transactions:leftToAllocate')} ${formatMoney(remaining)}`}
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
              onCommit={(payee) => {
                const patch: Partial<SplitDraft> = { payee }
                if (splitIsTransfer({ ...split, payee })) {
                  patch.category = ''
                }
                updateSplit(index, patch)
              }}
              onValueChange={(payee) => {
                const patch: Partial<SplitDraft> = { payee }
                if (splitIsTransfer({ ...split, payee })) {
                  patch.category = ''
                }
                updateSplit(index, patch)
              }}
              payeeOptions={payeeOptions}
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
          ) : (
            <div className="grid gap-2">
              <Label>{t('custom:frontend:filters:fields:category')}</Label>
              <div
                aria-disabled
                className="flex h-9 cursor-not-allowed items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
              >
                {t('custom:frontend:transactions:categoryNotNeeded')}
              </div>
            </div>
          )}

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
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={addSplit} size="sm" type="button" variant="outline">
          <Plus className="size-4" />
          {t('custom:frontend:transactions:addSplit')}
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
