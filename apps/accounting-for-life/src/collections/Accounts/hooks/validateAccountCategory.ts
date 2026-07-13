import type { CollectionBeforeChangeHook } from 'payload'

import type { Account } from '@/types'

/**
 * Enforces YNAB-style credit-card payment envelope rules on `accounts.category`.
 *
 * Only `subtype: credit_card` may reference a category (the payment envelope).
 * The link is usually set by {@link ensureCreditCardPaymentCategory} on create.
 */
export const validateAccountCategory: CollectionBeforeChangeHook<Account> = ({
  data,
  originalDoc,
}) => {
  const subtype = data?.subtype ?? originalDoc?.subtype
  const category = data?.category ?? originalDoc?.category

  // Credit cards keep their payment category; afterChange hook may still be linking it.
  if (subtype === 'credit_card') {
    return data
  }

  // Checking, savings, etc. must never carry a spending/payment category.
  if (category != null && category !== '') {
    throw new Error('Only credit card accounts may reference a payment category')
  }

  // Strip stale category if subtype changed away from credit_card.
  return {
    ...data,
    category: undefined,
  }
}
