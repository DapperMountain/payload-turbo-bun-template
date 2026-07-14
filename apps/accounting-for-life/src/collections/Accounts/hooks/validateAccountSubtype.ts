import type { CollectionBeforeChangeHook } from 'payload'

import { isSubtypeAllowedForClassification } from '@/lib/frontend/account-subtype'
import type { Account } from '@/types'

/** Rejects classification/subtype combos that the create-account picker disallows. */
export const validateAccountSubtype: CollectionBeforeChangeHook<Account> = ({
  data,
  originalDoc,
}) => {
  const classification = data?.classification ?? originalDoc?.classification
  const subtype = data?.subtype ?? originalDoc?.subtype

  if (!classification || !subtype) {
    return data
  }

  if (!isSubtypeAllowedForClassification(classification, subtype)) {
    throw new Error(`Subtype "${subtype}" is not valid for classification "${classification}"`)
  }

  return data
}
