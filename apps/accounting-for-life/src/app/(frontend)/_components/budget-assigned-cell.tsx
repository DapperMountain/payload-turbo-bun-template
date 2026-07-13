'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Input } from '@dappermountain/ui/components/input'
import { cn } from '@dappermountain/ui/lib/utils'

import { updateEnvelopeAssignedAction } from '@/app/(frontend)/actions/envelope-balances'
import type { BudgetMonthParams } from '@/lib/frontend/budget-month.types'
import { useAppTranslation } from '@/utils/i18n.client'

export type BudgetAssignedCellProps = {
  budgetId: string
  categoryId: string
  month: BudgetMonthParams
  assigned: number
}

const cellControlClass = 'h-9 w-full rounded-md px-3 text-right text-sm tabular-nums'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
}

function parseMoneyInput(raw: string): number | null {
  const normalized = raw.trim().replace(/[$,]/g, '')
  if (!normalized || normalized === '-') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function BudgetAssignedCell(props: BudgetAssignedCellProps) {
  const { budgetId, categoryId, month, assigned } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    if (!input) return
    input.focus({ preventScroll: true })
    input.select()
  }, [editing])

  const startEditing = () => {
    setError(null)
    setDraft(assigned === 0 ? '' : String(assigned))
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setDraft('')
    setError(null)
  }

  const save = () => {
    const parsed = parseMoneyInput(draft)
    const nextAssigned = parsed ?? 0

    if (parsed === null && draft.trim() !== '') {
      setError(t('custom:frontend:budgets:invalidAmount'))
      return
    }

    if (nextAssigned === assigned) {
      cancelEditing()
      return
    }

    startTransition(async () => {
      const result = await updateEnvelopeAssignedAction({
        budgetId,
        categoryId,
        year: month.year,
        month: month.month,
        assigned: nextAssigned,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      setEditing(false)
      setDraft('')
      setError(null)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <Input
        aria-invalid={error ? true : undefined}
        className={cn(cellControlClass, error && 'border-destructive')}
        disabled={isPending}
        inputMode="decimal"
        onBlur={save}
        onChange={(e) => {
          setDraft(e.target.value)
          if (error) setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            cancelEditing()
          }
        }}
        placeholder="0.00"
        ref={inputRef}
        title={error ?? undefined}
        type="text"
        value={draft}
      />
    )
  }

  return (
    <button
      className={cn(
        cellControlClass,
        'flex items-center justify-end border border-transparent transition-colors hover:bg-muted/60',
        assigned === 0 ? 'text-muted-foreground' : undefined,
        isPending && 'opacity-60',
      )}
      disabled={isPending}
      onClick={startEditing}
      title={t('custom:frontend:budgets:editAssigned')}
      type="button"
    >
      {formatMoney(assigned)}
    </button>
  )
}
