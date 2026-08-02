'use client'

import { cn } from '@dappermountain/ui/lib/utils'

import type { EconomicKind } from '@/lib/frontend/transaction-economic-kind'
import { useAppTranslation } from '@/utils/i18n.client'

export type EconomicKindBadgeProps = {
  kind: EconomicKind
  className?: string
  /** Softer style when the label is a guess awaiting confirmation. */
  ambiguous?: boolean
}

export function EconomicKindBadge(props: EconomicKindBadgeProps) {
  const { kind, className, ambiguous } = props
  const { t } = useAppTranslation()

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        ambiguous
          ? 'border-dashed border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border-border bg-muted/60 text-muted-foreground',
        className,
      )}
    >
      {t(`custom:frontend:transactions:economicKind:${kind}`)}
    </span>
  )
}
