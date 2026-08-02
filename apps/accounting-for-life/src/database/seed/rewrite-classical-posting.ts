import type { Payload } from 'payload'

import { seedSystemPnlAccounts } from '@/database/seed/system-accounts'
import {
  pnlAccountForCategoryLeg,
  SYSTEM_EXPENSE_ACCOUNT_NAME,
  SYSTEM_INCOME_ACCOUNT_NAME,
  type SystemPnlAccounts,
} from '@/lib/frontend/system-pnl-accounts'
import { getCollectionId } from '@/utils'

/**
 * Rewrites legacy same-account payment + categorized-offset twins into classical
 * cash/liability + system Income/Expense P&L legs.
 *
 * Safe to re-run: already-classical rows are left untouched.
 */
export async function rewriteSameAccountTwinsToClassicalPnl(payload: Payload): Promise<number> {
  await seedSystemPnlAccountsForBudgets(payload)

  const budgets = await payload.find({
    collection: 'budgets',
    pagination: false,
    overrideAccess: true,
  })

  let rewritten = 0

  for (const budget of budgets.docs) {
    const workspaceId = getCollectionId(budget.workspace)
    if (!workspaceId) continue

    const systemAccounts = await payload.find({
      collection: 'accounts',
      where: {
        and: [
          { budget: { equals: budget.id } },
          { isSystemDefault: { equals: true } },
        ],
      },
      pagination: false,
      overrideAccess: true,
    })

    const expenseId = systemAccounts.docs.find(
      (account) =>
        account.classification === 'expense' || account.name === SYSTEM_EXPENSE_ACCOUNT_NAME,
    )?.id
    const incomeId = systemAccounts.docs.find(
      (account) =>
        account.classification === 'income' || account.name === SYSTEM_INCOME_ACCOUNT_NAME,
    )?.id

    if (!expenseId || !incomeId) {
      payload.logger.warn(
        `🚨 [RewritePosting] Missing system P&L accounts for budget "${budget.id}"; skipping.`,
      )
      continue
    }

    const systemPnl: SystemPnlAccounts = {
      expenseAccountId: expenseId,
      incomeAccountId: incomeId,
    }

    const transactions = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          { budget: { equals: budget.id } },
          { type: { equals: 'transaction' } },
        ],
      },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    for (const transaction of transactions.docs) {
      const entries = await payload.find({
        collection: 'transaction-entries',
        where: { transaction: { equals: transaction.id } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
        sort: 'sortOrder',
      })

      if (entries.docs.length < 2) continue

      const paymentTotal = entries.docs
        .filter((entry) => !getCollectionId(entry.category))
        .reduce((sum, entry) => sum + entry.amount, 0)

      let changed = false
      const nextLines = []

      for (const entry of entries.docs) {
        const accountId = getCollectionId(entry.account)
        const categoryId = getCollectionId(entry.category)
        const existingPayee = entry.payee?.trim() || undefined

        if (!accountId || !categoryId || entry.amount === 0) {
          nextLines.push({
            account: accountId ?? '',
            amount: entry.amount,
            category: categoryId ?? undefined,
            payee: existingPayee,
            notes: entry.notes ?? undefined,
            sortOrder: entry.sortOrder,
            fxRate: entry.fxRate ?? undefined,
          })
          continue
        }

        const twin = entries.docs.find((other) => {
          if (other.id === entry.id) return false
          if (getCollectionId(other.account) !== accountId) return false
          if (other.amount === 0) return false
          if (Math.sign(other.amount) === Math.sign(entry.amount)) return false
          return !getCollectionId(other.category)
        })

        const category = await payload.findByID({
          collection: 'categories',
          id: categoryId,
          depth: 0,
          overrideAccess: true,
        })

        const pnlAccountId = twin
          ? pnlAccountForCategoryLeg(systemPnl, {
              paymentTotal,
              categoryPurpose: category.purpose,
            })
          : accountId

        if (pnlAccountId !== accountId) {
          changed = true
        }

        nextLines.push({
          account: pnlAccountId,
          amount: entry.amount,
          category: categoryId,
          payee: existingPayee,
          notes: entry.notes ?? undefined,
          sortOrder: entry.sortOrder,
          fxRate: entry.fxRate ?? undefined,
        })
      }

      if (!changed) continue

      await payload.update({
        collection: 'transactions',
        id: transaction.id,
        data: { entries: nextLines },
        overrideAccess: true,
      })
      rewritten += 1
    }
  }

  if (rewritten > 0) {
    payload.logger.info(
      `✅ [RewritePosting] Rewrote ${rewritten} transaction(s) to classical cash + P&L legs.`,
    )
  }

  return rewritten
}

async function seedSystemPnlAccountsForBudgets(payload: Payload): Promise<void> {
  const budgets = await payload.find({
    collection: 'budgets',
    pagination: false,
    overrideAccess: true,
  })

  for (const budget of budgets.docs) {
    const workspaceId = getCollectionId(budget.workspace)
    if (!workspaceId) continue
    await seedSystemPnlAccounts(payload, { budgetId: budget.id, workspaceId })
  }
}
