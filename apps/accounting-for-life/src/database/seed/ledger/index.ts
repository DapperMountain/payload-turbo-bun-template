import type { Account, Budget, Category, Unit, User, Workspace } from '@/types'
import config from '@config'
import type { Payload } from 'payload'

import { getCollectionId } from '@/utils'

import { withSeedLock } from '../locks'
import { seedSystemPnlAccounts } from '../system-accounts'
import type { SeedRunOptions } from '../types'
import { DEMO_WORKSPACE_DOMAIN } from '../workspaces'
import {
  SYSTEM_EXPENSE_ACCOUNT_NAME,
  SYSTEM_INCOME_ACCOUNT_NAME,
} from '@/lib/frontend/system-pnl-accounts'

type UnitSeed = {
  code: string
  name: string
  kind: Unit['kind']
  decimalPlaces: number
  symbol?: string | null
}

type AccountSeed = Pick<Account, 'name' | 'classification' | 'subtype'> & {
  unitCode: string
}

type SampleEntrySeed = {
  accountName: string
  amount: number
  fxRate?: number
  /** Spending/income category name on this budget (e.g. Financial Fees). */
  categoryName?: string
  /** Optional merchant on this leg (fee lines, etc.). */
  payee?: string
  notes?: string
}

type SampleTransactionSeed = {
  /** Stable idempotency handle — stored as `externalId` (`seed:<key>`). */
  key: string
  type: 'transfer' | 'transaction'
  date: string
  /** When set, posts with an explicit quote unit (usually reporting USD). */
  quoteUnitCode?: string
  entries: SampleEntrySeed[]
}

function sampleExternalId(seed: SampleTransactionSeed): string {
  return `seed:${seed.key}`
}

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

/** Idempotent — one unit per workspace + code; sets USD as reporting currency when missing. */
async function ensureUnit(
  payload: Payload,
  workspace: Workspace,
  seed: UnitSeed,
): Promise<Unit> {
  const existing = await payload.find({
    collection: 'units',
    limit: 1,
    where: {
      and: [{ workspace: { equals: workspace.id } }, { code: { equals: seed.code } }],
    },
    overrideAccess: true,
  })

  const unit =
    existing.docs[0] ??
    (await payload.create({
      collection: 'units',
      data: {
        workspace: workspace.id,
        code: seed.code,
        name: seed.name,
        kind: seed.kind,
        decimalPlaces: seed.decimalPlaces,
        ...(seed.symbol != null ? { symbol: seed.symbol } : {}),
      },
      overrideAccess: true,
    }))

  if (seed.code === 'USD' && !getCollectionId(workspace.reportingCurrency)) {
    await payload.update({
      collection: 'workspaces',
      id: workspace.id,
      data: { reportingCurrency: unit.id },
      overrideAccess: true,
    })
    workspace.reportingCurrency = unit.id
  }

  return unit
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
      visibility: 'all_members',
      ...seed,
    },
    overrideAccess: true,
  })
}

async function findCategoryByName(
  payload: Payload,
  budget: Budget,
  name: string,
): Promise<Category | null> {
  const found = await payload.find({
    collection: 'categories',
    limit: 1,
    where: {
      and: [{ budget: { equals: budget.id } }, { name: { equals: name } }],
    },
    overrideAccess: true,
  })
  return found.docs[0] ?? null
}

/** Remove retired demo fee expense account once nothing references it. */
async function removeObsoleteExchangeFeesAccount(
  payload: Payload,
  workspace: Workspace,
  budget: Budget,
): Promise<void> {
  const found = await payload.find({
    collection: 'accounts',
    limit: 1,
    where: {
      and: [
        { workspace: { equals: workspace.id } },
        { budget: { equals: budget.id } },
        { name: { equals: 'Exchange Fees' } },
      ],
    },
    overrideAccess: true,
  })

  const account = found.docs[0]
  if (!account) return

  const legs = await payload.find({
    collection: 'transaction-entries',
    limit: 1,
    where: { account: { equals: account.id } },
    overrideAccess: true,
  })

  if (legs.docs[0]) {
    payload.logger.warn(
      '🚨 [Ledger] Exchange Fees still has entries — leave account in place.',
    )
    return
  }

  await payload.delete({
    collection: 'accounts',
    id: account.id,
    overrideAccess: true,
  })
}

function fingerprintKey(parts: Array<{ accountId: string; amount: number }>): string {
  return [...parts]
    .map((part) => `${part.accountId}:${part.amount}`)
    .sort()
    .join('|')
}

function seedFingerprint(
  seed: SampleTransactionSeed,
  accountsByName: Map<string, Account>,
): string | null {
  const parts: Array<{ accountId: string; amount: number }> = []
  for (const entry of seed.entries) {
    const account = accountsByName.get(entry.accountName)
    if (!account) return null
    parts.push({ accountId: account.id, amount: entry.amount })
  }
  return fingerprintKey(parts)
}

async function entryFingerprintForTransaction(
  payload: Payload,
  transactionId: string,
): Promise<string | null> {
  const legs = await payload.find({
    collection: 'transaction-entries',
    where: { transaction: { equals: transactionId } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  if (!legs.docs.length) return null
  return fingerprintKey(
    legs.docs.map((leg) => ({
      accountId: getCollectionId(leg.account) ?? '',
      amount: leg.amount,
    })),
  )
}

async function deleteTransactionCascade(payload: Payload, transactionId: string): Promise<void> {
  await payload.delete({
    collection: 'transactions',
    id: transactionId,
    overrideAccess: true,
  })
}

/**
 * Collapse duplicate `seed:<key>` rows (keep oldest) and prior demo samples that
 * match a seed fingerprint but never got an `externalId` after the payee→key migrate.
 */
export async function dedupeSeedSampleTransactions(
  payload: Payload,
  workspace: Workspace,
  budget: Budget,
  accountsByName: Map<string, Account>,
): Promise<number> {
  let removed = 0

  const seeded = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { workspace: { equals: workspace.id } },
        { budget: { equals: budget.id } },
        { externalId: { like: 'seed:%' } },
      ],
    },
    sort: 'createdAt',
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })

  const keepByExternalId = new Map<string, string>()
  for (const transaction of seeded.docs) {
    const externalId = transaction.externalId?.trim()
    if (!externalId) continue
    const keeper = keepByExternalId.get(externalId)
    if (!keeper) {
      keepByExternalId.set(externalId, transaction.id)
      continue
    }
    await deleteTransactionCascade(payload, transaction.id)
    removed += 1
    payload.logger.warn(
      `🧹 [Ledger] Removed duplicate sample ${externalId} (${transaction.id}); kept ${keeper}.`,
    )
  }

  for (const sample of DEMO_TRANSACTIONS) {
    const externalId = sampleExternalId(sample)
    const expected = seedFingerprint(sample, accountsByName)
    if (!expected) continue

    const candidates = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          { workspace: { equals: workspace.id } },
          { budget: { equals: budget.id } },
          { type: { equals: sample.type } },
          { date: { greater_than_equal: `${sample.date}T00:00:00.000Z` } },
          { date: { less_than: `${sample.date}T23:59:59.999Z` } },
        ],
      },
      sort: 'createdAt',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    const matching: string[] = []
    for (const transaction of candidates.docs) {
      const print = await entryFingerprintForTransaction(payload, transaction.id)
      if (print === expected) matching.push(transaction.id)
    }

    if (matching.length === 0) continue

    const stamped = matching.find((id) =>
      seeded.docs.some((doc) => doc.id === id && doc.externalId === externalId),
    )
    const keeperId = stamped ?? matching[0]!

    if (!stamped) {
      await payload.update({
        collection: 'transactions',
        id: keeperId,
        data: { externalId, source: 'manual' },
        overrideAccess: true,
        depth: 0,
      })
      keepByExternalId.set(externalId, keeperId)
      payload.logger.info(
        `✅ [Ledger] Claimed legacy sample as ${externalId} (${keeperId}).`,
      )
    }

    for (const id of matching) {
      if (id === keeperId) continue
      await deleteTransactionCascade(payload, id)
      removed += 1
      payload.logger.warn(
        `🧹 [Ledger] Removed duplicate of ${externalId} (${id}); kept ${keeperId}.`,
      )
    }
  }

  return removed
}

async function ensureSampleTransaction(
  payload: Payload,
  workspace: Workspace,
  budget: Budget,
  adminUser: User,
  accountsByName: Map<string, Account>,
  categoriesByName: Map<string, Category>,
  unitsByCode: Map<string, Unit>,
  seed: SampleTransactionSeed,
): Promise<boolean> {
  const externalId = sampleExternalId(seed)
  const existing = await payload.find({
    collection: 'transactions',
    limit: 1,
    where: {
      and: [
        { workspace: { equals: workspace.id } },
        { externalId: { equals: externalId } },
      ],
    },
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return false
  }

  // Legacy rows (pre–externalId samples) — claim instead of inserting a twin.
  const expected = seedFingerprint(seed, accountsByName)
  if (expected) {
    const candidates = await payload.find({
      collection: 'transactions',
      where: {
        and: [
          { workspace: { equals: workspace.id } },
          { budget: { equals: budget.id } },
          { type: { equals: seed.type } },
          { date: { greater_than_equal: `${seed.date}T00:00:00.000Z` } },
          { date: { less_than: `${seed.date}T23:59:59.999Z` } },
        ],
      },
      sort: 'createdAt',
      limit: 20,
      depth: 0,
      overrideAccess: true,
    })

    for (const transaction of candidates.docs) {
      const print = await entryFingerprintForTransaction(payload, transaction.id)
      if (print !== expected) continue
      await payload.update({
        collection: 'transactions',
        id: transaction.id,
        data: { externalId },
        overrideAccess: true,
        depth: 0,
      })
      payload.logger.info(
        `✅ [Ledger] Linked existing sample to ${externalId} (${transaction.id}).`,
      )
      return false
    }
  }

  const entries = seed.entries.map((entry) => {
    const account = accountsByName.get(entry.accountName)
    if (!account) {
      throw new Error(`[Ledger] Missing account "${entry.accountName}" for seed "${seed.key}"`)
    }

    let category: string | undefined
    if (entry.categoryName) {
      const cat = categoriesByName.get(entry.categoryName)
      if (!cat) {
        throw new Error(
          `[Ledger] Missing category "${entry.categoryName}" for seed "${seed.key}"`,
        )
      }
      category = cat.id
    }

    return {
      account: account.id,
      amount: entry.amount,
      ...(entry.fxRate != null ? { fxRate: entry.fxRate } : {}),
      ...(category ? { category } : {}),
      ...(entry.payee?.trim() ? { payee: entry.payee.trim() } : {}),
      ...(entry.notes?.trim() ? { notes: entry.notes.trim() } : {}),
    }
  })

  const quoteUnit = seed.quoteUnitCode ? unitsByCode.get(seed.quoteUnitCode) : undefined
  if (seed.quoteUnitCode && !quoteUnit) {
    throw new Error(`[Ledger] Missing quote unit "${seed.quoteUnitCode}" for seed "${seed.key}"`)
  }

  await payload.create({
    collection: 'transactions',
    data: {
      workspace: workspace.id,
      budget: budget.id,
      date: seed.date,
      externalId,
      type: seed.type,
      ...(quoteUnit ? { quoteUnit: quoteUnit.id } : {}),
      entries,
    },
    user: adminUser,
    overrideAccess: true,
  })

  return true
}

const DEMO_UNITS: UnitSeed[] = [
  { code: 'USD', name: 'US Dollar', kind: 'fiat', decimalPlaces: 2, symbol: '$' },
  { code: 'XRP', name: 'XRP', kind: 'crypto', decimalPlaces: 6, symbol: 'XRP' },
  { code: 'XLM', name: 'Stellar Lumens', kind: 'crypto', decimalPlaces: 7, symbol: 'XLM' },
  { code: 'BTC', name: 'Bitcoin', kind: 'crypto', decimalPlaces: 8, symbol: '₿' },
  { code: 'SEASHELLS', name: 'Seashells', kind: 'custom', decimalPlaces: 0, symbol: 'sh' },
]

const DEMO_ACCOUNTS: AccountSeed[] = [
  { name: 'Checking', classification: 'asset', subtype: 'checking', unitCode: 'USD' },
  { name: 'Savings', classification: 'asset', subtype: 'savings', unitCode: 'USD' },
  { name: 'XRP Wallet', classification: 'asset', subtype: 'holding', unitCode: 'XRP' },
  { name: 'XLM Wallet', classification: 'asset', subtype: 'holding', unitCode: 'XLM' },
  { name: 'BTC Wallet', classification: 'asset', subtype: 'holding', unitCode: 'BTC' },
  { name: 'Seashell jar', classification: 'asset', subtype: 'holding', unitCode: 'SEASHELLS' },
]

/**
 * Sample books for Demo Household — same-unit transfer plus mixed-unit journals.
 *
 * Reporting currency is USD. Mixed-unit samples set quoteUnit to USD (= reporting)
 * so `fxRate` is USD per 1 account unit (same numbers as before, clearer quote frame).
 *
 * 1. Straightforward: 100 XRP → 200 XLM ($50 quote each side)
 * 2. With fee: fair XRP↔XLM plus $5 Checking → Budget expenses (Financial Fees)
 * 3. Basket: sell 0.005 BTC into XRP + XLM + $10 cash
 * 4. Barter: 200 seashells for $5
 */
const DEMO_TRANSACTIONS: SampleTransactionSeed[] = [
  {
    key: 'transfer-to-savings',
    type: 'transfer',
    date: '2026-07-01',
    entries: [
      { accountName: 'Checking', amount: -100 },
      {
        accountName: 'Savings',
        amount: 100,
        notes: 'Same-unit USD transfer (baseline).',
      },
    ],
  },
  {
    key: 'xrp-to-xlm',
    type: 'transfer',
    date: '2026-07-08',
    quoteUnitCode: 'USD',
    entries: [
      { accountName: 'XRP Wallet', amount: -100, fxRate: 0.5 },
      {
        accountName: 'XLM Wallet',
        amount: 200,
        fxRate: 0.25,
        notes: 'Straightforward crypto journal at $0.50 / $0.25 (quote USD).',
      },
    ],
  },
  {
    key: 'kraken-xrp-to-xlm-with-fee',
    type: 'transaction',
    date: '2026-07-09',
    quoteUnitCode: 'USD',
    entries: [
      { accountName: 'XRP Wallet', amount: -100, fxRate: 0.5, payee: 'Kraken' },
      { accountName: 'XLM Wallet', amount: 200, fxRate: 0.25 },
      // Classical DE fee: cash outflow + system expense P&L leg (category tag).
      { accountName: 'Checking', amount: -5 },
      {
        accountName: 'Budget expenses',
        amount: 5,
        categoryName: 'Financial Fees',
        payee: 'Kraken',
        notes: 'Exchange fee on XRP→XLM.',
      },
    ],
  },
  {
    key: 'coinbase-btc-basket',
    type: 'transaction',
    date: '2026-07-10',
    quoteUnitCode: 'USD',
    entries: [
      {
        accountName: 'BTC Wallet',
        amount: -0.005,
        fxRate: 60_000,
        payee: 'Coinbase',
        notes: 'Sell into XRP + XLM basket with $10 cash residual.',
      },
      { accountName: 'XRP Wallet', amount: 400, fxRate: 0.5 },
      { accountName: 'XLM Wallet', amount: 300, fxRate: 0.3 },
      { accountName: 'Checking', amount: 10 },
    ],
  },
  {
    key: 'boardwalk-seashells',
    type: 'transaction',
    date: '2026-07-11',
    quoteUnitCode: 'USD',
    entries: [
      {
        accountName: 'Seashell jar',
        amount: -200,
        fxRate: 0.025,
        payee: 'Boardwalk shell stand',
        notes: 'Sold 200 seashells @ $0.025.',
      },
      { accountName: 'Checking', amount: 5 },
    ],
  },
]

/**
 * Seeds demo units, accounts, and sample transfers/swaps for the default demo budget.
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
      const usd = await ensureUnit(payload, workspace, DEMO_UNITS[0])

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

      if (workspace.domain !== DEMO_WORKSPACE_DOMAIN) {
        await ensureAccount(payload, workspace, defaultBudget, usd, {
          name: 'Checking',
          classification: 'asset',
          subtype: 'checking',
        })
        await ensureAccount(payload, workspace, defaultBudget, usd, {
          name: 'Savings',
          classification: 'asset',
          subtype: 'savings',
        })
        for (const budget of budgets.docs) {
          await seedSystemPnlAccounts(payload, {
            budgetId: budget.id,
            workspaceId: workspace.id,
          })
        }
        return
      }

      await removeObsoleteExchangeFeesAccount(payload, workspace, defaultBudget)

      const unitsByCode = new Map<string, Unit>()
      for (const unitSeed of DEMO_UNITS) {
        unitsByCode.set(unitSeed.code, await ensureUnit(payload, workspace, unitSeed))
      }

      await seedSystemPnlAccounts(payload, {
        budgetId: defaultBudget.id,
        workspaceId: workspace.id,
      })

      const accountsByName = new Map<string, Account>()
      for (const accountSeed of DEMO_ACCOUNTS) {
        const unit = unitsByCode.get(accountSeed.unitCode)
        if (!unit) {
          throw new Error(`[Ledger] Missing unit ${accountSeed.unitCode}`)
        }
        const { unitCode: _unitCode, ...accountFields } = accountSeed
        accountsByName.set(
          accountSeed.name,
          await ensureAccount(payload, workspace, defaultBudget, unit, accountFields),
        )
      }

      for (const systemName of [SYSTEM_EXPENSE_ACCOUNT_NAME, SYSTEM_INCOME_ACCOUNT_NAME]) {
        const found = await payload.find({
          collection: 'accounts',
          limit: 1,
          where: {
            and: [
              { workspace: { equals: workspace.id } },
              { budget: { equals: defaultBudget.id } },
              { name: { equals: systemName } },
            ],
          },
          overrideAccess: true,
        })
        if (found.docs[0]) {
          accountsByName.set(systemName, found.docs[0])
        }
      }

      // Also ensure system accounts for non-demo budgets in this workspace.
      for (const budget of budgets.docs) {
        if (budget.id === defaultBudget.id) continue
        await seedSystemPnlAccounts(payload, {
          budgetId: budget.id,
          workspaceId: workspace.id,
        })
      }

      const financialFees = await findCategoryByName(payload, defaultBudget, 'Financial Fees')
      if (!financialFees) {
        payload.logger.warn(
          '🚨 [Ledger] Category "Financial Fees" missing — run categories seed first. Skipping fee demo.',
        )
      }

      const categoriesByName = new Map<string, Category>()
      if (financialFees) {
        categoriesByName.set('Financial Fees', financialFees)
      }

      const samples = financialFees
        ? DEMO_TRANSACTIONS
        : DEMO_TRANSACTIONS.filter((sample) =>
            sample.entries.every((entry) => !entry.categoryName),
          )

      const removed = await dedupeSeedSampleTransactions(
        payload,
        workspace,
        defaultBudget,
        accountsByName,
      )
      if (removed > 0) {
        payload.logger.info(
          `🧹 [Ledger] Removed ${removed} duplicate demo sample(s) for "${workspace.name}".`,
        )
      }

      let created = 0
      for (const sample of samples) {
        const didCreate = await ensureSampleTransaction(
          payload,
          workspace,
          defaultBudget,
          adminUser,
          accountsByName,
          categoriesByName,
          unitsByCode,
          sample,
        )
        if (didCreate) created += 1
      }

      if (created === 0) {
        payload.logger.warn(
          `🚨 [Ledger] Sample transactions already exist for "${workspace.name}", accounts/units ensured.`,
        )
        return
      }

      payload.logger.info(
        `✅ [Ledger] Seeded units, accounts, and ${created} sample transaction(s) for "${workspace.name}" (${getCollectionId(defaultBudget)}).`,
      )
    })
  }
}

/**
 * Repair-only: collapse duplicate demo samples (by `seed:*` externalId or entry fingerprint).
 * Safe to run from `db:seed repair` without recreating missing samples.
 */
export async function repairLedgerSampleDuplicates(payload: Payload): Promise<void> {
  const workspaces = await payload.find({
    collection: 'workspaces',
    where: { domain: { equals: DEMO_WORKSPACE_DOMAIN } },
    pagination: false,
    overrideAccess: true,
  })

  for (const workspace of workspaces.docs) {
    const budgets = await payload.find({
      collection: 'budgets',
      where: { workspace: { equals: workspace.id } },
      pagination: false,
      overrideAccess: true,
    })
    const defaultBudget =
      budgets.docs.find((budget) => budget.isDefault) ?? budgets.docs[0]
    if (!defaultBudget) continue

    const accounts = await payload.find({
      collection: 'accounts',
      where: {
        and: [
          { workspace: { equals: workspace.id } },
          { budget: { equals: defaultBudget.id } },
        ],
      },
      pagination: false,
      overrideAccess: true,
    })
    const accountsByName = new Map(accounts.docs.map((account) => [account.name, account]))

    const removed = await dedupeSeedSampleTransactions(
      payload,
      workspace,
      defaultBudget,
      accountsByName,
    )
    if (removed > 0) {
      payload.logger.info(
        `🧹 [Ledger] Repair removed ${removed} duplicate demo sample(s) for "${workspace.name}".`,
      )
    }
  }
}
