import type { SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import { seedBudgets } from './budgets'
import { seedCategories, seedCategoriesForAllBudgets } from './categories'
import { repairSeedDuplicates } from './dedupe'
import { seedLedger } from './ledger'
import { rewriteSameAccountTwinsToClassicalPnl } from './rewrite-classical-posting'
import { seedSystemPnlAccountsForAllBudgets } from './system-accounts'
import { seedUsers } from './users'
import { seedWorkspaces } from './workspaces'

const USAGE = `Usage: bun run db:seed <users|workspaces|budgets|categories|ledger|all|repair|rewrite-posting> [--budget=<id>]

  users            Seed admin/user accounts (DATA_SEED_* vars in .env)
  workspaces       Demo Household + Lake Cabin (localhost:3001, cabin.localhost) + link demo user
  budgets          Sample budgets per workspace (Household + Vacation on demo; categories via hook)
  categories       Seed category groups + categories for budgets missing them
  ledger           Units (USD/XRP/XLM/BTC/SEASHELLS), wallets, sample transfer + swap demos (Demo Household)
  all              users → workspaces → budgets → ledger → rewrite-posting (full dev dataset after db:push)
  repair           Remove duplicate budgets / groups / categories / demo ledger samples
  rewrite-posting  Convert same-account category twins → cash + system P&L legs

Examples:
  bun run db:seed all
  bun run db:seed repair
  bun run db:seed rewrite-posting
  bun run db:seed workspaces
  bun run db:seed budgets
  bun run db:seed categories
  bun run db:seed categories --budget=01932a1a-...`

/**
 * Payload bin entry — registered as `payload seed` / `bun run db:seed`.
 */
export async function script(config: SanitizedConfig): Promise<void> {
  const seederName = process.argv[3]
  const budgetId = process.argv.find((arg) => arg.startsWith('--budget='))?.slice('--budget='.length)

  if (!seederName || seederName === '--help' || seederName === '-h') {
    console.log(USAGE)
    return
  }

  process.env.PAYLOAD_DISABLE_ON_INIT_SEED = '1'

  const payload = await getPayload({ config })

  payload.logger.info(`🌱 [${seederName}] Running seeder (manual).`)

  switch (seederName) {
    case 'users':
      await seedUsers(payload, { force: true })
      break
    case 'workspaces':
      await seedWorkspaces(payload, { force: true })
      break
    case 'budgets':
      await seedBudgets(payload, { force: true })
      break
    case 'categories':
      if (budgetId) {
        const budget = await payload.findByID({
          collection: 'budgets',
          id: budgetId,
          overrideAccess: true,
        })
        const workspaceId =
          typeof budget.workspace === 'string' ? budget.workspace : budget.workspace?.id

        if (!workspaceId) {
          payload.logger.error(`❌ [Categories] Budget "${budgetId}" has no workspace.`)
          process.exit(1)
        }

        await seedCategories(payload, { budgetId: budget.id, workspaceId })
      } else {
        await seedCategoriesForAllBudgets(payload)
      }
      break
    case 'ledger':
      await seedLedger(payload, { force: true })
      await seedSystemPnlAccountsForAllBudgets(payload)
      await rewriteSameAccountTwinsToClassicalPnl(payload)
      break
    case 'all':
      await seedUsers(payload, { force: true })
      await seedWorkspaces(payload, { force: true })
      await seedBudgets(payload, { force: true })
      await seedLedger(payload, { force: true })
      await seedSystemPnlAccountsForAllBudgets(payload)
      await rewriteSameAccountTwinsToClassicalPnl(payload)
      break
    case 'repair':
      await repairSeedDuplicates(payload)
      await seedSystemPnlAccountsForAllBudgets(payload)
      await rewriteSameAccountTwinsToClassicalPnl(payload)
      break
    case 'rewrite-posting':
      await seedSystemPnlAccountsForAllBudgets(payload)
      await rewriteSameAccountTwinsToClassicalPnl(payload)
      break
    default:
      console.error(`Unknown seeder "${seederName}".\n\n${USAGE}`)
      process.exit(1)
  }

  payload.logger.info(`✅ [${seederName}] Done.`)
}
