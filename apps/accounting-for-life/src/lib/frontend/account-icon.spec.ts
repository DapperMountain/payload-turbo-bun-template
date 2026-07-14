import { describe, expect, it } from 'bun:test'
import { CreditCard, Landmark, PiggyBank, Scale, TrendingUp } from '@dappermountain/ui/icons'

import { accountIconFor } from '@/lib/frontend/account-icon'

describe('accountIconFor', () => {
  it('uses subtype-specific icons', () => {
    expect(accountIconFor({ classification: 'asset', subtype: 'checking' })).toBe(Landmark)
    expect(accountIconFor({ classification: 'asset', subtype: 'savings' })).toBe(PiggyBank)
    expect(accountIconFor({ classification: 'liability', subtype: 'credit_card' })).toBe(CreditCard)
  })

  it('falls back to classification icons for other', () => {
    expect(accountIconFor({ classification: 'equity', subtype: 'other' })).toBe(Scale)
    expect(accountIconFor({ classification: 'income', subtype: 'other' })).toBe(TrendingUp)
  })
})
