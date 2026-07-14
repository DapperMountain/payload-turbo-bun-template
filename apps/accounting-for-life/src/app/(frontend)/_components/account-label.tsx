import type { ComponentProps } from 'react'
import { cn } from '@dappermountain/ui/lib/utils'

import { accountIconFor } from '@/lib/frontend/account-icon'
import type { Account } from '@/types'

export type AccountLabelProps = {
  account: Pick<Account, 'subtype' | 'classification'>
  name: string
  className?: string
  iconClassName?: string
  nameClassName?: string
} & Omit<ComponentProps<'span'>, 'children'>

/** Account name with a subtype/classification icon. */
export function AccountLabel(props: AccountLabelProps) {
  const { account, name, className, iconClassName, nameClassName, title, ...rest } = props
  const Icon = accountIconFor(account)

  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-2', className)}
      title={title ?? name}
      {...rest}
    >
      <Icon
        aria-hidden
        className={cn('size-4 shrink-0 text-muted-foreground', iconClassName)}
      />
      <span className={cn('truncate', nameClassName)}>{name}</span>
    </span>
  )
}
