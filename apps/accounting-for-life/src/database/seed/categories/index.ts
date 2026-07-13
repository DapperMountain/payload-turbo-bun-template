import type { Payload, PayloadRequest } from 'payload'

import { dedupeDuplicateCategoryCatalog } from '../dedupe'
import { withSeedLock } from '../locks'

type CategoryGroupKind = 'income' | 'expense'

type CategoryPurpose = 'income' | 'spending'

type CategorySeed = {
  name: string
  emoji: string
  purpose: CategoryPurpose
}

type CategoryGroupSeed = {
  name: string
  kind: CategoryGroupKind
  categories: CategorySeed[]
}

/** Ordered catalog — Income first, then expense groups. */
const categoryCatalog: CategoryGroupSeed[] = [
  {
    name: 'Income',
    kind: 'income',
    categories: [
      { name: 'Paychecks', emoji: '💵', purpose: 'income' },
      { name: 'Cash Back', emoji: '💳', purpose: 'income' },
      { name: 'Interest', emoji: '💸', purpose: 'income' },
      { name: 'Business Income', emoji: '💰', purpose: 'income' },
      { name: 'Investment Income', emoji: '💰', purpose: 'income' },
      { name: 'Other Income', emoji: '💰', purpose: 'income' },
      { name: 'Dividends & Capital Gains', emoji: '📈', purpose: 'income' },
    ],
  },
  {
    name: 'Fixed',
    kind: 'expense',
    categories: [
      { name: 'Mortgage', emoji: '🏠', purpose: 'spending' },
      { name: 'Water', emoji: '💧', purpose: 'spending' },
      { name: 'Gas & Electric', emoji: '⚡', purpose: 'spending' },
      { name: 'Internet & Cable', emoji: '🌐', purpose: 'spending' },
      { name: 'Phone', emoji: '📱', purpose: 'spending' },
      { name: 'School Tuition', emoji: '🎓', purpose: 'spending' },
      { name: 'Lessons', emoji: '👨‍🏫', purpose: 'spending' },
      { name: 'Auto Payment', emoji: '🚗', purpose: 'spending' },
      { name: 'Auto Insurance', emoji: '☂️', purpose: 'spending' },
      { name: 'Medical Insurance', emoji: '☂️', purpose: 'spending' },
      { name: 'Home Services', emoji: '🌱', purpose: 'spending' },
      { name: 'Allowance', emoji: '💵', purpose: 'spending' },
    ],
  },
  {
    name: 'Food & Dining',
    kind: 'expense',
    categories: [
      { name: 'Groceries', emoji: '🍏', purpose: 'spending' },
      { name: 'Dining Out', emoji: '🍔', purpose: 'spending' },
      { name: 'School Lunch', emoji: '🍕', purpose: 'spending' },
    ],
  },
  {
    name: 'Subscriptions',
    kind: 'expense',
    categories: [
      { name: 'Streaming & Gaming', emoji: '🍿', purpose: 'spending' },
      { name: 'Memberships & Clubs', emoji: '💳', purpose: 'spending' },
      { name: 'Productivity', emoji: '👨‍💻', purpose: 'spending' },
      { name: 'Hosting', emoji: '☁️', purpose: 'spending' },
    ],
  },
  {
    name: 'Lifestyle',
    kind: 'expense',
    categories: [
      { name: 'Entertainment & Recreation', emoji: '🎥', purpose: 'spending' },
      { name: 'Apps & Games', emoji: '💿', purpose: 'spending' },
      { name: 'Gas', emoji: '⛽', purpose: 'spending' },
      { name: 'Pets', emoji: '🐶', purpose: 'spending' },
      { name: 'Personal Care', emoji: '👑', purpose: 'spending' },
      { name: 'Charity', emoji: '🎗️', purpose: 'spending' },
      { name: 'Fun Money', emoji: '🤪', purpose: 'spending' },
    ],
  },
  {
    name: 'Shopping',
    kind: 'expense',
    categories: [
      { name: 'Shopping', emoji: '🛍️', purpose: 'spending' },
      { name: 'Clothing', emoji: '👕', purpose: 'spending' },
      { name: 'Furniture & Housewares', emoji: '🪑', purpose: 'spending' },
      { name: 'Electronics & Appliances', emoji: '🖥️', purpose: 'spending' },
      { name: 'Office Supplies & Expenses', emoji: '📎', purpose: 'spending' },
      { name: 'Postage & Shipping', emoji: '📦', purpose: 'spending' },
    ],
  },
  {
    name: 'Health & Wellness',
    kind: 'expense',
    categories: [
      { name: 'Providers', emoji: '👨‍⚕️', purpose: 'spending' },
      { name: 'Medicine', emoji: '💊', purpose: 'spending' },
      { name: 'Supplies', emoji: '💉', purpose: 'spending' },
      { name: 'Fitness', emoji: '💪', purpose: 'spending' },
    ],
  },
  {
    name: 'Financial',
    kind: 'expense',
    categories: [
      { name: 'Credit Card Debt', emoji: '💳', purpose: 'spending' },
      { name: 'Loan Repayment', emoji: '💰', purpose: 'spending' },
      { name: 'Financial & Legal Services', emoji: '🗄️', purpose: 'spending' },
      { name: 'Financial Fees', emoji: '🏦', purpose: 'spending' },
      { name: 'Cash & ATM', emoji: '🏧', purpose: 'spending' },
    ],
  },
  {
    name: 'Other',
    kind: 'expense',
    categories: [
      { name: 'Uncategorized', emoji: '❓', purpose: 'spending' },
      { name: 'Check', emoji: '💸', purpose: 'spending' },
      { name: 'Miscellaneous', emoji: '💲', purpose: 'spending' },
      { name: 'Reimbursable Expenses', emoji: '💼', purpose: 'spending' },
    ],
  },
  {
    name: 'Savings',
    kind: 'expense',
    categories: [
      { name: 'Gifts & Special Occasions', emoji: '🎁', purpose: 'spending' },
      { name: 'Home Improvement', emoji: '🔨', purpose: 'spending' },
      { name: 'Auto Maintenance', emoji: '🔧', purpose: 'spending' },
      { name: 'Travel & Vacation', emoji: '🏝️', purpose: 'spending' },
      { name: 'Education', emoji: '🏫', purpose: 'spending' },
      { name: 'Taxes', emoji: '🏛️', purpose: 'spending' },
    ],
  },
]

type SeedCategoriesArgs = {
  budgetId: string
  workspaceId: string
  req?: PayloadRequest
}

/**
 * Seeds default category groups and categories for a budget.
 *
 * Skips when the budget already has groups. Uses `overrideAccess: true` and passes
 * `req` when provided so callers inside hooks participate in the same transaction.
 *
 * @param payload - Initialized Payload instance.
 * @param args - Budget and workspace to seed; optional request for hook context.
 */
export async function seedCategories(
  payload: Payload,
  { budgetId, workspaceId, req }: SeedCategoriesArgs,
): Promise<void> {
  return withSeedLock(`categories:${budgetId}`, async () => {
    await dedupeDuplicateCategoryCatalog(payload, budgetId)

    for (const [groupIndex, groupSeed] of categoryCatalog.entries()) {
      try {
        const existingGroup = await payload.find({
          collection: 'category-groups',
          limit: 1,
          where: {
            and: [
              { budget: { equals: budgetId } },
              { name: { equals: groupSeed.name } },
            ],
          },
          req,
          overrideAccess: true,
        })

        let groupId = existingGroup.docs[0]?.id

        if (groupId) {
          payload.logger.warn(
            `🚨 [Categories] Group "${groupSeed.name}" already exists for budget "${budgetId}", filling missing categories.`,
          )
        } else {
          const group = await payload.create({
            collection: 'category-groups',
            data: {
              name: groupSeed.name,
              kind: groupSeed.kind,
              sortOrder: groupIndex,
              budget: budgetId,
              workspace: workspaceId,
            },
            req,
            overrideAccess: true,
          })
          groupId = group.id
          payload.logger.info(`✅ [Categories] Group "${groupSeed.name}" inserted successfully.`)
        }

        for (const [categoryIndex, categorySeed] of groupSeed.categories.entries()) {
          const existingCategory = await payload.find({
            collection: 'categories',
            limit: 1,
            where: {
              and: [
                { budget: { equals: budgetId } },
                { categoryGroup: { equals: groupId } },
                { name: { equals: categorySeed.name } },
              ],
            },
            req,
            overrideAccess: true,
          })

          if (existingCategory.totalDocs > 0) {
            continue
          }

          await payload.create({
            collection: 'categories',
            data: {
              name: categorySeed.name,
              emoji: categorySeed.emoji,
              purpose: categorySeed.purpose,
              sortOrder: categoryIndex,
              isSystemDefault: true,
              categoryGroup: groupId,
              budget: budgetId,
              workspace: workspaceId,
            },
            req,
            overrideAccess: true,
          })
        }
      } catch (error) {
        payload.logger.error(
          `❌ [Categories] Failed to insert group "${groupSeed.name}": ${
            error instanceof Error ? error.message : 'Unknown error occurred.'
          }`,
        )
      }
    }
  })
}

/**
 * Seeds the default category catalog for every budget that has no groups yet.
 *
 * Not gated by `DATA_SEED_ENABLED` — safe to run via `bun run db:seed categories`.
 */
export async function seedCategoriesForAllBudgets(payload: Payload): Promise<void> {
  const budgets = await payload.find({
    collection: 'budgets',
    pagination: false,
    overrideAccess: true,
  })

  if (budgets.docs.length === 0) {
    payload.logger.warn(
      '🚨 [Categories] No budgets found — create one in admin or run `bun run db:seed budgets`.',
    )
    return
  }

  for (const budget of budgets.docs) {
    const workspaceId = typeof budget.workspace === 'string' ? budget.workspace : budget.workspace?.id

    if (!workspaceId) {
      payload.logger.warn(`🚨 [Categories] Budget "${budget.id}" has no workspace; skipping.`)
      continue
    }

    await seedCategories(payload, { budgetId: budget.id, workspaceId })
  }
}
