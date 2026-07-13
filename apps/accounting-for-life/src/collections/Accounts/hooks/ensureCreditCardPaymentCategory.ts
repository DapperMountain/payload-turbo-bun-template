import type { CollectionAfterChangeHook } from 'payload'

import type { Account } from '@/types'

/**
 * Auto-provisions a per-card payment envelope when a credit card account is created (US-3.4).
 *
 * Runs in `afterChange` because we need the persisted account `id` and the category must
 * exist before we can link it. Uses `overrideAccess` — this is system bookkeeping, not
 * a user-facing create on category-groups/categories.
 */
export const ensureCreditCardPaymentCategory: CollectionAfterChangeHook<Account> = async ({
  doc,
  operation,
  req,
}) => {
  // Updates skip this path; category is set once on create.
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

  // One "Credit Card Payments" group per budget (YNAB reserved group kind).
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

  // One payment envelope per card — funded when spending on that card.
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

  // Second write on the same account — links the envelope we just created.
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
