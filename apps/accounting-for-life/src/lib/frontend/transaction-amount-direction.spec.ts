import { describe, expect, it } from 'bun:test'

import {
  directionFromSignedAmount,
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
})
