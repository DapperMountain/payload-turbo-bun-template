import type { Account } from '@/types'

export type AccountClassification = Account['classification']
export type AccountSubtype = Account['subtype']

/** Subtypes allowed for each account classification (create/edit pickers). */
const SUBTYPES_BY_CLASSIFICATION: Record<AccountClassification, readonly AccountSubtype[]> = {
  asset: ['checking', 'savings', 'cash', 'holding', 'other'],
  liability: ['credit_card', 'loan', 'other'],
  equity: ['other'],
  income: ['other'],
  expense: ['other'],
}

const DEFAULT_SUBTYPE: Record<AccountClassification, AccountSubtype> = {
  asset: 'checking',
  liability: 'credit_card',
  equity: 'other',
  income: 'other',
  expense: 'other',
}

export function subtypesForClassification(
  classification: AccountClassification,
): readonly AccountSubtype[] {
  return SUBTYPES_BY_CLASSIFICATION[classification]
}

export function defaultSubtypeForClassification(
  classification: AccountClassification,
): AccountSubtype {
  return DEFAULT_SUBTYPE[classification]
}

export function isSubtypeAllowedForClassification(
  classification: AccountClassification,
  subtype: AccountSubtype,
): boolean {
  return subtypesForClassification(classification).includes(subtype)
}

/** Keep subtype valid when the user changes classification. */
export function subtypeAfterClassificationChange(
  classification: AccountClassification,
  currentSubtype: AccountSubtype,
): AccountSubtype {
  if (isSubtypeAllowedForClassification(classification, currentSubtype)) {
    return currentSubtype
  }

  return defaultSubtypeForClassification(classification)
}

/** Checking / savings / cash — settlement side of buys and sells. */
export function isCashLikeAccount(account: Account | undefined): boolean {
  if (!account || account.classification !== 'asset') return false
  return account.subtype === 'checking' || account.subtype === 'savings' || account.subtype === 'cash'
}

/** Investment / crypto holding accounts. */
export function isHoldingAccount(account: Account | undefined): boolean {
  if (!account || account.classification !== 'asset') return false
  return account.subtype === 'holding'
}
