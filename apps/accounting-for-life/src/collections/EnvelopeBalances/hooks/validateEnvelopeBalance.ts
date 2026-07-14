import type { CollectionBeforeChangeHook } from 'payload'

import type { EnvelopeBalance } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/**
 * Envelope assignment rules enforced for REST/GraphQL clients and the Next.js UI alike.
 */
export const validateEnvelopeBalance: CollectionBeforeChangeHook<EnvelopeBalance> = async ({
  data,
  originalDoc,
  req,
}) => {
  const budgetId =
    typeof (data?.budget ?? originalDoc?.budget) === 'string'
      ? (data?.budget ?? originalDoc?.budget)
      : (data?.budget ?? originalDoc?.budget)?.id
  const categoryId =
    typeof (data?.category ?? originalDoc?.category) === 'string'
      ? (data?.category ?? originalDoc?.category)
      : (data?.category ?? originalDoc?.category)?.id

  if (!budgetId || !categoryId) {
    return data
  }

  const category = await req.payload.findByID({
    collection: 'categories',
    id: categoryId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (getCollectionId(category.budget) !== budgetId) {
    throw new Error('Category does not belong to this budget')
  }

  if (category.purpose === 'income') {
    throw new Error('Income categories are not assigned — they flow to Ready to assign')
  }

  return data
}
