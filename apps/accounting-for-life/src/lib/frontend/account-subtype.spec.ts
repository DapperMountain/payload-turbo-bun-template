import { describe, expect, it } from 'bun:test'

import {
  defaultSubtypeForClassification,
  isSubtypeAllowedForClassification,
  subtypeAfterClassificationChange,
  subtypesForClassification,
} from '@/lib/frontend/account-subtype'

describe('account-subtype', () => {
  it('limits asset subtypes to cash-like and holdings accounts', () => {
    expect(subtypesForClassification('asset')).toEqual([
      'checking',
      'savings',
      'cash',
      'holding',
      'other',
    ])
    expect(isSubtypeAllowedForClassification('asset', 'credit_card')).toBe(false)
  })

  it('limits liability subtypes to credit cards and loans', () => {
    expect(subtypesForClassification('liability')).toEqual(['credit_card', 'loan', 'other'])
    expect(isSubtypeAllowedForClassification('liability', 'checking')).toBe(false)
  })

  it('resets subtype when classification no longer allows it', () => {
    expect(subtypeAfterClassificationChange('liability', 'checking')).toBe('credit_card')
    expect(subtypeAfterClassificationChange('asset', 'cash')).toBe('cash')
    expect(defaultSubtypeForClassification('equity')).toBe('other')
  })
})
