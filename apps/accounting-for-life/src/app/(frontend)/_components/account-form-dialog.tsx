'use client'

import { useState, useTransition } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@dappermountain/ui/components/dialog'
import { Input } from '@dappermountain/ui/components/input'
import { Label } from '@dappermountain/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { Plus } from '@dappermountain/ui/icons'

import { createAccountAction } from '@/app/(frontend)/actions/accounts'
import { AccountLabel } from '@/app/(frontend)/_components/account-label'
import { accountIconFor } from '@/lib/frontend/account-icon'
import {
  defaultSubtypeForClassification,
  subtypeAfterClassificationChange,
  subtypesForClassification,
} from '@/lib/frontend/account-subtype'
import type { Account } from '@/types'
import { useAppTranslation } from '@/utils/i18n.client'

export type AccountFormDialogProps = {
  budgets: { id: string; name: string }[]
  units: { id: string; label: string }[]
}

const CLASSIFICATIONS = [
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
] as const satisfies readonly Account['classification'][]

export function AccountFormDialog(props: AccountFormDialogProps) {
  const { budgets, units } = props
  const { t } = useAppTranslation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [classification, setClassification] = useState<Account['classification']>('asset')
  const [subtype, setSubtype] = useState<Account['subtype']>(
    defaultSubtypeForClassification('asset'),
  )
  const [unit, setUnit] = useState(units[0]?.id ?? '')
  const [budget, setBudget] = useState(budgets[0]?.id ?? '')
  const [visibility, setVisibility] = useState<Account['visibility']>('all_members')

  const subtypeOptions = subtypesForClassification(classification)

  const reset = () => {
    setName('')
    setClassification('asset')
    setSubtype(defaultSubtypeForClassification('asset'))
    setUnit(units[0]?.id ?? '')
    setBudget(budgets[0]?.id ?? '')
    setVisibility('all_members')
    setError(null)
  }

  const onClassificationChange = (next: Account['classification']) => {
    setClassification(next)
    setSubtype((current) => subtypeAfterClassificationChange(next, current))
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createAccountAction({
        name,
        classification,
        subtype,
        unit,
        budget,
        visibility,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      setOpen(false)
      reset()
    })
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          {t('custom:frontend:accounts:create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('custom:frontend:accounts:createTitle')}</DialogTitle>
          <DialogDescription>{t('custom:collections:accounts:description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="account-name">{t('custom:frontend:filters:fields:name')}</Label>
            <Input
              id="account-name"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:frontend:filters:fields:classification')}</Label>
            <Select onValueChange={(v) => onClassificationChange(v as Account['classification'])} value={classification}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASSIFICATIONS.map((value) => {
                  const Icon = accountIconFor({
                    classification: value,
                    subtype: defaultSubtypeForClassification(value),
                  })
                  return (
                    <SelectItem key={value} value={value}>
                      <span className="inline-flex items-center gap-2">
                        <Icon aria-hidden className="size-4 text-muted-foreground" />
                        {t(`custom:fields:accounts:classification:${value}`)}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:frontend:filters:fields:subtype')}</Label>
            <Select onValueChange={(v) => setSubtype(v as Account['subtype'])} value={subtype}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subtypeOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    <AccountLabel
                      account={{ classification, subtype: value }}
                      name={t(`custom:fields:accounts:subtype:${value}`)}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:collections:units:singular')}</Label>
            <Select onValueChange={setUnit} value={unit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:frontend:filters:fields:budget')}</Label>
            <Select onValueChange={setBudget} value={budget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('custom:frontend:accounts:visibilityLabel')}</Label>
            <Select
              onValueChange={(value) => setVisibility(value as Account['visibility'])}
              value={visibility}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['all_members', 'admins'] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`custom:fields:accounts:visibility:${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('custom:fields:accounts:visibilityDescription')}
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button disabled={isPending || !name.trim()} onClick={submit}>
            {t('custom:frontend:forms:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
