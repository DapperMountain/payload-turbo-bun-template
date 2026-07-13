'use client'

import { useState, useTransition } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Checkbox } from '@dappermountain/ui/components/checkbox'
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
import { Plus } from '@dappermountain/ui/icons'

import { createBudgetAction } from '@/app/(frontend)/actions/budgets'
import { useAppTranslation } from '@/utils/i18n.client'

export function BudgetFormDialog() {
  const { t } = useAppTranslation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  const reset = () => {
    setName('')
    setIsDefault(false)
    setError(null)
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createBudgetAction({ name, isDefault })

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
          {t('custom:frontend:budgets:create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('custom:frontend:budgets:createTitle')}</DialogTitle>
          <DialogDescription>{t('custom:collections:budgets:description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="budget-name">{t('custom:frontend:filters:fields:name')}</Label>
            <Input id="budget-name" onChange={(e) => setName(e.target.value)} value={name} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
            {t('custom:frontend:budgets:defaultLabel')}
          </label>

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
