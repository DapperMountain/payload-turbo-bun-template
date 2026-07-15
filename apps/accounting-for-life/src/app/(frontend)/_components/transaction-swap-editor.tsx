'use client'

import { Button } from '@dappermountain/ui/components/button'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import { Plus, Trash2 } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import {
  isSwapFormBalanced,
  legNeedsFxRate,
  newSwapLegDraft,
  reportingAmountForLeg,
  swapReportingTotal,
  type SwapLegDraft,
} from '@/lib/frontend/transaction-swap'
import type { Account } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionSwapEditorProps = {
  legs: SwapLegDraft[]
  onChange: (legs: SwapLegDraft[]) => void
  accountOptions: RelationshipFilterOption[]
  categoryOptions: RelationshipFilterOption[]
  accounts: Account[]
  reportingCurrencyId: string | null
  formatAccountGroup: (group: string) => string
  disabled?: boolean
}

function formatReporting(amount: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 8,
  }).format(amount)
}

export function TransactionSwapEditor(props: TransactionSwapEditorProps) {
  const {
    legs,
    onChange,
    accountOptions,
    categoryOptions,
    accounts,
    reportingCurrencyId,
    formatAccountGroup,
    disabled,
  } = props
  const { t } = useAppTranslation()

  const total = swapReportingTotal(legs, accounts, reportingCurrencyId)
  const balanced = isSwapFormBalanced(legs, accounts, reportingCurrencyId)

  const updateLeg = (index: number, patch: Partial<SwapLegDraft>) => {
    onChange(legs.map((leg, legIndex) => (legIndex === index ? { ...leg, ...patch } : leg)))
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {t('custom:frontend:transactions:swapDescription')}
      </p>

      <div className="grid gap-3">
        {legs.map((leg, index) => {
          const needsFx = legNeedsFxRate(leg.account, accounts, reportingCurrencyId)
          const reporting = reportingAmountForLeg(leg, accounts, reportingCurrencyId)

          return (
            <div
              className="grid gap-3 rounded-lg border bg-muted/10 p-3"
              key={leg.key}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t('custom:frontend:transactions:swapLeg', { index: index + 1 })}
                </span>
                <Button
                  disabled={disabled || legs.length <= 2}
                  onClick={() => onChange(legs.filter((_, legIndex) => legIndex !== index))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">{t('custom:frontend:transactions:removeSwapLeg')}</span>
                </Button>
              </div>

              <div className="grid gap-2">
                <Label>{t('custom:frontend:filters:fields:account')}</Label>
                <GroupedPicker
                  disabled={disabled}
                  formatGroup={formatAccountGroup}
                  onValueChange={(value) => updateLeg(index, { account: value })}
                  options={accountOptions}
                  placeholder={t('custom:frontend:filters:selectValue')}
                  searchPlaceholder={t('custom:frontend:filters:searchAccounts')}
                  value={leg.account}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{t('custom:frontend:transactions:swapAmount')}</Label>
                  <Input
                    disabled={disabled}
                    inputMode="decimal"
                    onChange={(event) => updateLeg(index, { amount: event.target.value })}
                    placeholder="0"
                    value={leg.amount}
                  />
                </div>
                {needsFx ? (
                  <div className="grid gap-2">
                    <Label>{t('custom:frontend:transactions:swapFxRate')}</Label>
                    <Input
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(event) => updateLeg(index, { fxRate: event.target.value })}
                      placeholder="1"
                      value={leg.fxRate}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>{t('custom:frontend:transactions:swapReporting')}</Label>
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm tabular-nums">
                      {formatReporting(reporting)}
                    </div>
                  </div>
                )}
              </div>

              {needsFx ? (
                <p className="text-xs text-muted-foreground">
                  {t('custom:frontend:transactions:swapReportingPreview', {
                    amount: formatReporting(reporting),
                  })}
                </p>
              ) : null}

              <div className="grid gap-2">
                <Label>{t('custom:frontend:filters:fields:category')}</Label>
                <GroupedPicker
                  disabled={disabled}
                  emptyLabel={t('custom:frontend:filters:isEmpty')}
                  emptyValue=""
                  onValueChange={(value) => updateLeg(index, { category: value })}
                  options={categoryOptions}
                  placeholder={t('custom:frontend:filters:selectValue')}
                  searchPlaceholder={t('custom:frontend:filters:searchCategories')}
                  value={leg.category}
                />
              </div>
            </div>
          )
        })}
      </div>

      <Button
        disabled={disabled}
        onClick={() => onChange([...legs, newSwapLegDraft()])}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
        {t('custom:frontend:transactions:addSwapLeg')}
      </Button>

      <div
        className={cn(
          'rounded-md border px-3 py-2 text-sm',
          balanced
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
            : 'border-destructive/40 bg-destructive/10 text-destructive',
        )}
      >
        {t('custom:frontend:transactions:swapBalance', {
          amount: formatReporting(total),
        })}
      </div>
    </div>
  )
}
