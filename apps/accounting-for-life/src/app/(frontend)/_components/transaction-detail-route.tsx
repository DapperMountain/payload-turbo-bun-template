'use client'

import { useRouter } from 'next/navigation'

import { TransactionDetailDialog } from '@/app/(frontend)/_components/transaction-detail-dialog'
import type { TransactionDialogView } from '@/lib/frontend/transaction-splits'
import type { Account, Category, Transaction, Unit } from '@/types'

export type TransactionDetailRouteProps = {
  transaction: Transaction
  accounts: Account[]
  accountLabels: Record<string, string>
  categories: Category[]
  payeeOptionsByBudget: Record<string, string[]>
  reportingCurrencyId: string | null
  units: Unit[]
  initialView?: TransactionDialogView
  /** Soft-nav overlay: pop history so the underlying list keeps filters/page. */
  dismissWithBack?: boolean
}

export function TransactionDetailRoute(props: TransactionDetailRouteProps) {
  const router = useRouter()
  const dismissWithBack = props.dismissWithBack ?? false

  return (
    <TransactionDetailDialog
      accountLabels={props.accountLabels}
      accounts={props.accounts}
      categories={props.categories}
      initialView={props.initialView}
      onOpenChange={(open) => {
        if (!open) {
          if (dismissWithBack) {
            router.back()
            return
          }
          router.push('/transactions')
        }
      }}
      open
      payeeOptionsByBudget={props.payeeOptionsByBudget}
      reportingCurrencyId={props.reportingCurrencyId}
      transaction={props.transaction}
      units={props.units}
    />
  )
}
