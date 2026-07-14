'use client'

import { ArrowLeft, ArrowRight } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import { AccountLabel } from '@/app/(frontend)/_components/account-label'
import type { TransferPayeePresentation } from '@/lib/frontend/transaction-payee'
import { useAppTranslation } from '@/utils/i18n.client'

export type TransferPayeeLabelProps = {
  presentation: TransferPayeePresentation
  className?: string
}

function transferHoverTitle(
  presentation: TransferPayeePresentation,
  kind: string,
): string {
  const { mode, source, destination } = presentation
  if (mode === 'outbound') return `${kind} → ${destination.name}`
  if (mode === 'inbound') return `${kind} ← ${source.name}`
  return `${kind} ${source.name} → ${destination.name}`
}

/** Ledger payee: "Transfer → Savings" / "Payment ← Checking" with account icons. */
export function TransferPayeeLabel(props: TransferPayeeLabelProps) {
  const { presentation, className } = props
  const { mode, source, destination } = presentation
  const { t } = useAppTranslation()

  const kind = presentation.isPayment
    ? t('custom:frontend:transactions:paymentKind')
    : t('custom:frontend:transactions:transferKind')
  const title = transferHoverTitle(presentation, kind)

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)} title={title}>
      <span className="shrink-0 text-muted-foreground">{kind}</span>
      {mode === 'outbound' ? (
        <>
          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <AccountLabel account={destination} name={destination.name} title={title} />
        </>
      ) : null}
      {mode === 'inbound' ? (
        <>
          <ArrowLeft aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <AccountLabel account={source} name={source.name} title={title} />
        </>
      ) : null}
      {mode === 'pair' ? (
        <>
          <AccountLabel account={source} name={source.name} title={title} />
          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <AccountLabel account={destination} name={destination.name} title={title} />
        </>
      ) : null}
    </span>
  )
}
