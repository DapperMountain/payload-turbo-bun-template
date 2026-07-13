'use client'

import { Label } from '@dappermountain/ui/components/label'

import { TransactionDateTimePicker } from '@/app/(frontend)/_components/transaction-datetime-picker'
import { GroupedPicker } from '@/app/(frontend)/_components/grouped-picker'
import { findAccount } from '@/lib/frontend/transaction-payee'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import type { Account } from '@/types'
import { Input } from '@dappermountain/ui/components/input'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionDialogDateFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function TransactionDialogDateField(props: TransactionDialogDateFieldProps) {
  const { id, value, onChange, disabled } = props
  const { t } = useAppTranslation()

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{t('custom:frontend:transactions:dateTimeLabel')}</Label>
      <TransactionDateTimePicker
        disabled={disabled}
        id={id}
        onChange={onChange}
        value={value}
      />
    </div>
  )
}

export type TransactionDialogAccountFieldProps = {
  accounts: Account[]
  accountOptions: RelationshipFilterOption[]
  value: string
  onChange: (accountId: string) => void
  lockedAccountId?: string | null
  formatAccountGroup?: (group: string) => string
  disabled?: boolean
}

export function TransactionDialogAccountField(props: TransactionDialogAccountFieldProps) {
  const {
    accounts,
    accountOptions,
    value,
    onChange,
    lockedAccountId,
    formatAccountGroup,
    disabled,
  } = props
  const { t } = useAppTranslation()

  const lockedId = lockedAccountId ?? null
  const displayAccount = findAccount(accounts, lockedId ?? value)

  if (lockedId) {
    return (
      <div className="grid gap-2">
        <Label>{t('custom:collections:accounts:singular')}</Label>
        <Input
          className="bg-muted/40 text-muted-foreground"
          disabled
          readOnly
          value={displayAccount?.name ?? '—'}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <Label>{t('custom:collections:accounts:singular')}</Label>
      <GroupedPicker
        disabled={disabled}
        formatGroup={formatAccountGroup}
        onValueChange={onChange}
        options={accountOptions}
        placeholder={t('custom:frontend:filters:selectValue')}
        searchPlaceholder={t('custom:frontend:filters:searchAccounts')}
        value={value}
      />
    </div>
  )
}
