import type { ComponentType, SVGProps } from 'react'
import {
  Banknote,
  Building2,
  Coins,
  CreditCard,
  HandCoins,
  Landmark,
  PiggyBank,
  Scale,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from '@dappermountain/ui/icons'

import type { Account } from '@/types'

type AccountIconSource = Pick<Account, 'subtype' | 'classification'>
type AccountIconComponent = ComponentType<SVGProps<SVGSVGElement>>

const SUBTYPE_ICONS: Record<Account['subtype'], AccountIconComponent> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  credit_card: CreditCard,
  loan: HandCoins,
  holding: Coins,
  other: Wallet,
}

const CLASSIFICATION_ICONS: Record<Account['classification'], AccountIconComponent> = {
  asset: Building2,
  liability: CreditCard,
  equity: Scale,
  income: TrendingUp,
  expense: ShoppingBag,
}

/** Prefer subtype glyph; for `other`, use the classification glyph. */
export function accountIconFor(account: AccountIconSource): AccountIconComponent {
  if (account.subtype !== 'other') {
    return SUBTYPE_ICONS[account.subtype]
  }

  return CLASSIFICATION_ICONS[account.classification] ?? Wallet
}
