import type { SanitizedConfig } from 'payload'
import { getPayload } from 'payload'

import { seedBudgets } from './budgets'
import { seedCategories, seedCategoriesForAllBudgets } from './categories'
import { repairSeedDuplicates } from './dedupe'
import { seedUsers } from './users'
import { seedWorkspaces } from './workspaces'

const USAGE = `Usage: bun run db:seed <users|workspaces|budgets|categories|repair> [--budget=<id>]

  users       Seed admin/user accounts (requires DATA_SEED_ENABLED env vars)
  workspaces  Demo Household + Lake Cabin (localhost:3001, cabin.localhost) + link demo user
  budgets     Sample budgets per workspace (Household + Vacation on demo; categories via hook)
  categories  Seed category groups + categories for budgets missing them
  repair      Remove duplicate budgets / groups / categories from prior seed races

Examples:
  bun run db:seed repair
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
    case 'repair':
      await repairSeedDuplicates(payload)
      break
    default:
      console.error(`Unknown seeder "${seederName}".\n\n${USAGE}`)
      process.exit(1)
  }

  payload.logger.info(`✅ [${seederName}] Done.`)
}
