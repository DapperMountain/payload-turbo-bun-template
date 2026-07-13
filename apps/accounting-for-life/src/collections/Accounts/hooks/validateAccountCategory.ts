import type { CollectionBeforeChangeHook } from 'payload'

import type { Account } from '@/types'

/**
 * Credit-card accounts may only reference a payment category; other subtypes must not.
 */
export const validateAccountCategory: CollectionBeforeChangeHook<Account> = ({
  data,
  originalDoc,
}) => {
  const subtype = data?.subtype ?? originalDoc?.subtype
  const category = data?.category ?? originalDoc?.category

  if (subtype === 'credit_card') {
    return data
  }

  if (category != null && category !== '') {
    throw new Error('Only credit card accounts may reference a payment category')
  }

  return {
    ...data,
    category: undefined,
  }
}
