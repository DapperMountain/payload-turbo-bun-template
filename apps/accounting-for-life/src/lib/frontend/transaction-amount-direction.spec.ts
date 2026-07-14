import { describe, expect, it } from 'bun:test'

import {
  directionFromSignedAmount,
  registerAmountDisplay,
  signedAmountFromDirection,
} from '@/lib/frontend/transaction-amount-direction'
import type { Account } from '@/types'

const checking: Account = {
  id: 'checking',
  name: 'Checking',
  classification: 'asset',
  subtype: 'checking',
  workspace: 'ws',
  budget: 'budget',
  unit: 'usd',
  isOnBudget: true,
  updatedAt: '',
  createdAt: '',
}

const creditCard: Account = {
  id: 'card',
  name: 'Visa',
  classification: 'liability',
  subtype: 'credit_card',
  workspace: 'ws',
  budget: 'budget',
  unit: 'usd',
  isOnBudget: true,
  updatedAt: '',
  createdAt: '',
}

describe('transaction-amount-direction', () => {
  it('treats asset outflow as negative and inflow as positive', () => {
    expect(signedAmountFromDirection('outflow', 40, checking)).toBe(-40)
    expect(signedAmountFromDirection('inflow', 40, checking)).toBe(40)
    expect(directionFromSignedAmount(-40, checking)).toBe('outflow')
    expect(directionFromSignedAmount(40, checking)).toBe('inflow')
  })

  it('treats credit card charge as positive and credit as negative', () => {
    expect(signedAmountFromDirection('outflow', 100, creditCard)).toBe(100)
    expect(signedAmountFromDirection('inflow', 100, creditCard)).toBe(-100)
    expect(directionFromSignedAmount(100, creditCard)).toBe('outflow')
    expect(directionFromSignedAmount(-100, creditCard)).toBe('inflow')
  })

  it('formats register amounts as absolute values with a credit plus prefix', () => {
    const credit = registerAmountDisplay(25, checking)
    expect(credit.isCredit).toBe(true)
    expect(credit.prefix).toBe('+')
    expect(credit.absoluteText.includes('-')).toBe(false)

    const debit = registerAmountDisplay(-40, checking)
    expect(debit.isCredit).toBe(false)
    expect(debit.prefix).toBe('')
    expect(debit.absoluteText.includes('-')).toBe(false)

    expect(registerAmountDisplay(-25, creditCard).isCredit).toBe(true)
    expect(registerAmountDisplay(100, creditCard).isCredit).toBe(false)
  })
})
