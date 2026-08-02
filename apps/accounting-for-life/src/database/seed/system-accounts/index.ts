import type { Payload, PayloadRequest } from 'payload'

import {
  SYSTEM_EXPENSE_ACCOUNT_NAME,
  SYSTEM_INCOME_ACCOUNT_NAME,
} from '@/lib/frontend/system-pnl-accounts'
import { getCollectionId } from '@/utils'

import { withSeedLock } from '../locks'

type SeedSystemAccountsOptions = {
  budgetId: string
  workspaceId: string
  req?: PayloadRequest
}

async function ensureWorkspaceUnit(
  payload: Payload,
  workspaceId: string,
  req?: PayloadRequest,
): Promise<string> {
  const workspace = await payload.findByID({
    collection: 'workspaces',
    id: workspaceId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const reportingId = getCollectionId(workspace.reportingCurrency)
  if (reportingId) return reportingId

  const existing = await payload.find({
    collection: 'units',
    limit: 10,
    where: { workspace: { equals: workspaceId } },
    overrideAccess: true,
    req,
  })

  const usd = existing.docs.find((unit) => unit.code === 'USD')
  if (usd) {
    if (!reportingId) {
      await payload.update({
        collection: 'workspaces',
        id: workspaceId,
        data: { reportingCurrency: usd.id },
        overrideAccess: true,
        req,
      })
    }
    return usd.id
  }

  if (existing.docs[0]) return existing.docs[0].id

  const created = await payload.create({
    collection: 'units',
    data: {
      workspace: workspaceId,
      code: 'USD',
      name: 'US Dollar',
      kind: 'fiat',
      decimalPlaces: 2,
      symbol: '$',
    },
    overrideAccess: true,
    req,
  })

  await payload.update({
    collection: 'workspaces',
    id: workspaceId,
    data: { reportingCurrency: created.id },
    overrideAccess: true,
    req,
  })

  return created.id
}

async function ensureSystemAccount(
  payload: Payload,
  options: {
    budgetId: string
    workspaceId: string
    unitId: string
    name: string
    classification: 'income' | 'expense'
    req?: PayloadRequest
  },
): Promise<void> {
  const existing = await payload.find({
    collection: 'accounts',
    limit: 1,
    where: {
      and: [
        { budget: { equals: options.budgetId } },
        { workspace: { equals: options.workspaceId } },
        {
          or: [
            {
              and: [
                { classification: { equals: options.classification } },
                { isSystemDefault: { equals: true } },
              ],
            },
            { name: { equals: options.name } },
          ],
        },
      ],
    },
    overrideAccess: true,
    req: options.req,
  })

  if (existing.docs[0]) {
    const doc = existing.docs[0]
    if (!doc.isSystemDefault || doc.classification !== options.classification) {
      await payload.update({
        collection: 'accounts',
        id: doc.id,
        data: {
          isSystemDefault: true,
          classification: options.classification,
          subtype: 'other',
          name: options.name,
        },
        overrideAccess: true,
        req: options.req,
      })
    }
    return
  }

  await payload.create({
    collection: 'accounts',
    data: {
      workspace: options.workspaceId,
      budget: options.budgetId,
      unit: options.unitId,
      name: options.name,
      classification: options.classification,
      subtype: 'other',
      isOnBudget: true,
      isSystemDefault: true,
      visibility: 'all_members',
    },
    overrideAccess: true,
    req: options.req,
  })
}

/**
 * Idempotent — ensures thin system Income + Expense chart accounts for a budget.
 *
 * Called from budget create (alongside category catalog) and ledger backfill.
 */
export async function seedSystemPnlAccounts(
  payload: Payload,
  options: SeedSystemAccountsOptions,
): Promise<void> {
  const { budgetId, workspaceId, req } = options

  await withSeedLock(`system-accounts:${budgetId}`, async () => {
    const unitId = await ensureWorkspaceUnit(payload, workspaceId, req)

    await ensureSystemAccount(payload, {
      budgetId,
      workspaceId,
      unitId,
      name: SYSTEM_EXPENSE_ACCOUNT_NAME,
      classification: 'expense',
      req,
    })

    await ensureSystemAccount(payload, {
      budgetId,
      workspaceId,
      unitId,
      name: SYSTEM_INCOME_ACCOUNT_NAME,
      classification: 'income',
      req,
    })
  })
}

/** Backfill system P&L accounts for every budget (safe to re-run). */
export async function seedSystemPnlAccountsForAllBudgets(payload: Payload): Promise<void> {
  const budgets = await payload.find({
    collection: 'budgets',
    pagination: false,
    overrideAccess: true,
  })

  for (const budget of budgets.docs) {
    const workspaceId = getCollectionId(budget.workspace)
    if (!workspaceId) {
      payload.logger.warn(`🚨 [SystemAccounts] Budget "${budget.id}" has no workspace; skipping.`)
      continue
    }

    await seedSystemPnlAccounts(payload, { budgetId: budget.id, workspaceId })
  }
}
