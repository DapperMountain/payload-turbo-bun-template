import type { Account, Budget, Unit, User, Workspace } from '@/types'
import config from '@config'
import type { Payload } from 'payload'

import { getCollectionId } from '@/utils'

import { withSeedLock } from '../locks'
import type { SeedRunOptions } from '../types'
import { DEMO_WORKSPACE_DOMAIN } from '../workspaces'

async function findAdminUser(payload: Payload): Promise<User | null> {
  const { admin } = config.database.seed
  const found = await payload.find({
    collection: 'users',
    limit: 1,
    where: { email: { equals: admin.email } },
    overrideAccess: true,
  })

  return found.docs[0] ?? null
}

/** Idempotent — one USD unit per workspace. */
async function ensureUnit(payload: Payload, workspace: Workspace): Promise<Unit> {
  const existing = await payload.find({
    collection: 'units',
    limit: 1,
    where: {
      and: [{ workspace: { equals: workspace.id } }, { code: { equals: 'USD' } }],
    },
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return existing.docs[0]
  }

  return payload.create({
    collection: 'units',
    data: {
      workspace: workspace.id,
      code: 'USD',
      name: 'US Dollar',
      kind: 'currency',
      decimalPlaces: 2,
      symbol: '$',
    },
    overrideAccess: true,
  })
}

/** Idempotent — keyed by workspace + budget + account name. */
async function ensureAccount(
  payload: Payload,
  workspace: Workspace,
  budget: Budget,
  unit: Unit,
  seed: Pick<Account, 'name' | 'classification' | 'subtype'>,
): Promise<Account> {
  const existing = await payload.find({
    collection: 'accounts',
    limit: 1,
    where: {
      and: [
        { workspace: { equals: workspace.id } },
        { budget: { equals: budget.id } },
        { name: { equals: seed.name } },
      ],
    },
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return existing.docs[0]
  }

  return payload.create({
    collection: 'accounts',
    data: {
      workspace: workspace.id,
      budget: budget.id,
      unit: unit.id,
      isOnBudget: true,
      ...seed,
    },
    overrideAccess: true,
  })
}

/**
 * Seeds demo units, accounts, and a sample transfer for the default demo budget.
 *
 * Gives the Payload admin **Ledger** section non-empty list views on first run.
 */
export async function seedLedger(payload: Payload, options?: SeedRunOptions): Promise<void> {
  if (!options?.force && !config.database.seed.enabled) {
    return
  }

  const adminUser = await findAdminUser(payload)

  if (!adminUser) {
    payload.logger.warn('🚨 [Ledger] Admin user not found — skipping ledger seed.')
    return
  }

  const workspaces = await payload.find({
    collection: 'workspaces',
    pagination: false,
    overrideAccess: true,
  })

  for (const workspace of workspaces.docs) {
    await withSeedLock(`ledger:${workspace.id}`, async () => {
      const unit = await ensureUnit(payload, workspace)

      const budgets = await payload.find({
        collection: 'budgets',
        where: { workspace: { equals: workspace.id } },
        pagination: false,
        overrideAccess: true,
      })

      const defaultBudget =
        budgets.docs.find((budget) => budget.isDefault) ?? budgets.docs[0]

      if (!defaultBudget) {
        payload.logger.warn(
          `🚨 [Ledger] No budget for workspace "${workspace.name}" — skipping accounts.`,
        )
        return
      }

      const checking = await ensureAccount(payload, workspace, defaultBudget, unit, {
        name: 'Checking',
        classification: 'asset',
        subtype: 'checking',
      })

      const savings = await ensureAccount(payload, workspace, defaultBudget, unit, {
        name: 'Savings',
        classification: 'asset',
        subtype: 'savings',
      })

      // Sample transaction only on the primary dev workspace — keeps Lake Cabin minimal.
      if (workspace.domain !== DEMO_WORKSPACE_DOMAIN) {
        return
      }

      const existingTransfer = await payload.find({
        collection: 'transactions',
        limit: 1,
        where: {
          and: [
            { workspace: { equals: workspace.id } },
            { memo: { equals: 'Seed transfer to savings' } },
          ],
        },
        overrideAccess: true,
      })

      if (existingTransfer.docs[0]) {
        payload.logger.warn(
          `🚨 [Ledger] Sample transfer already exists for "${workspace.name}", skipping.`,
        )
        return
      }

      // Posted via transactions collection create + entries hook.
      await payload.create({
        collection: 'transactions',
        data: {
          workspace: workspace.id,
          budget: defaultBudget.id,
          date: new Date().toISOString().slice(0, 10),
          memo: 'Seed transfer to savings',
          type: 'transfer',
          entries: [
            { account: checking.id, amount: -100 },
            { account: savings.id, amount: 100 },
          ],
        },
        user: adminUser,
        overrideAccess: true,
      })

      payload.logger.info(
        `✅ [Ledger] Seeded accounts and sample transfer for "${workspace.name}" (${getCollectionId(defaultBudget)}).`,
      )
    })
  }
}
