'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@dappermountain/ui/components/popover'

import { updateTransactionAction } from '@/app/(frontend)/actions/transactions'
import { TransactionSplitsEditor } from '@/app/(frontend)/_components/transaction-splits-editor'
import {
  buildEntriesForSave,
  hasEditableSplits,
  isSplitFormBalanced,
  normalizeSplitFormFromEntries,
  serializeSplitForm,
  type TransactionSplitFormState,
} from '@/lib/frontend/transaction-splits'
import { transactionEntries } from '@/lib/frontend/transactions.display'
import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import type { Account, Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransactionSplitsPopoverProps = {
  transaction: Transaction
  accounts: Account[]
  categoryOptions: RelationshipFilterOption[]
  payeeOptions: string[]
  label: string
  onSaved?: () => void
  onOpenDetail?: () => void
}

export function TransactionSplitsPopover(props: TransactionSplitsPopoverProps) {
  const { transaction, accounts, categoryOptions, payeeOptions, label, onSaved, onOpenDetail } = props
  const { t } = useAppTranslation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const entries = transactionEntries(transaction)
  const normalized = normalizeSplitFormFromEntries(entries)
  const budgetId = getCollectionId(transaction.budget)

  const [splitState, setSplitState] = useState<TransactionSplitFormState>(normalized)
  const [initialForm, setInitialForm] = useState(serializeSplitForm(normalized))

  useEffect(() => {
    if (!open) return
    const next = normalizeSplitFormFromEntries(entries)
    setSplitState(next)
    setInitialForm(serializeSplitForm(next))
    setError(null)
  }, [open, entries])

  if (!hasEditableSplits(normalized) && normalized.splits.length === 0) {
    return null
  }

  const save = () => {
    setError(null)

    if (!isSplitFormBalanced(splitState)) {
      setError(t('custom:frontend:transactions:leftToAllocate'))
      return
    }

    startTransition(async () => {
      try {
        const entries = buildEntriesForSave({
          splitState,
          categoryId: normalized.displayCategoryId,
          activeView: 'split',
          isTransfer: transaction.type === 'transfer',
          accounts,
          budgetId,
        })
        const result = await updateTransactionAction({
          id: transaction.id,
          entries,
        })

        if (!result.ok) {
          setError(result.error)
          return
        }

        setOpen(false)
        onSaved?.()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Update failed')
      }
    })
  }

  const dirty = serializeSplitForm(splitState) !== initialForm

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          className="h-8 max-w-[12rem] justify-start truncate px-2 font-normal"
          onClick={(event) => event.stopPropagation()}
          type="button"
          variant="outline"
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[60] w-[min(24rem,calc(100vw-2rem))] max-h-[min(32rem,calc(100vh-4rem))] overflow-y-auto p-4"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onWheel={(event) => event.stopPropagation()}
      >
        <TransactionSplitsEditor
          accounts={accounts}
          budgetId={budgetId || undefined}
          categoryOptions={categoryOptions}
          disabled={isPending}
          onChange={setSplitState}
          payeeOptions={payeeOptions}
          preferredCategoryId={normalized.displayCategoryId}
          state={splitState}
        />

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={isPending || !dirty} onClick={save} size="sm" type="button">
            {t('custom:frontend:forms:save')}
          </Button>
          {onOpenDetail ? (
            <Button onClick={onOpenDetail} size="sm" type="button" variant="ghost">
              {t('custom:frontend:transactions:openDetail')}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
