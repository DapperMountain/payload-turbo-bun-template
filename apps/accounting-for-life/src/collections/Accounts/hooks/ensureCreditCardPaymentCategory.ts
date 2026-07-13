import type { CollectionAfterChangeHook } from 'payload'

import type { Account } from '@/types'

/**
 * When a credit card account is created, ensure a payment envelope category exists and link it.
 */
export const ensureCreditCardPaymentCategory: CollectionAfterChangeHook<Account> = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create' || doc.subtype !== 'credit_card') {
    return doc
  }

  if (doc.category) {
    return doc
  }

  const budgetId = typeof doc.budget === 'string' ? doc.budget : doc.budget?.id
  const workspaceId = typeof doc.workspace === 'string' ? doc.workspace : doc.workspace?.id

  if (!budgetId || !workspaceId) {
    throw new Error('Credit card accounts require workspace and budget')
  }

  const existingGroup = await req.payload.find({
    collection: 'category-groups',
    where: {
      and: [
        { budget: { equals: budgetId } },
        { kind: { equals: 'credit_card_payments' } },
      ],
    },
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })

  let groupId = existingGroup.docs[0]?.id

  if (!groupId) {
    const group = await req.payload.create({
      collection: 'category-groups',
      data: {
        workspace: workspaceId,
        budget: budgetId,
        name: 'Credit Card Payments',
        kind: 'credit_card_payments',
        sortOrder: 999,
      },
      req,
      overrideAccess: true,
    })
    groupId = group.id
  }

  const category = await req.payload.create({
    collection: 'categories',
    data: {
      workspace: workspaceId,
      budget: budgetId,
      categoryGroup: groupId,
      name: `${doc.name} Payment`,
      purpose: 'credit_card_payment',
      sortOrder: 0,
    },
    req,
    overrideAccess: true,
  })

  return req.payload.update({
    collection: 'accounts',
    id: doc.id,
    data: {
      category: category.id,
    },
    req,
    overrideAccess: true,
  })
}
