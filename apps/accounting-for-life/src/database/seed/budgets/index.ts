import type { Budget, Workspace } from '@/types'
import config from '@config'
import type { Payload } from 'payload'

import { DEMO_WORKSPACE_DOMAIN } from '../workspaces'
import { dedupeDuplicateBudgets } from '../dedupe'
import { withSeedLock } from '../locks'
import type { SeedRunOptions } from '../types'

type BudgetSeed = Pick<Budget, 'name' | 'isDefault'>

/** Default budgets for the demo household (multi-budget example). */
const demoHouseholdBudgets: BudgetSeed[] = [
  { name: 'Household', isDefault: true },
  { name: 'Vacation', isDefault: false },
]

/** Fallback when a workspace is not the demo household. */
const defaultBudgets: BudgetSeed[] = [{ name: 'Personal', isDefault: true }]

function budgetsForWorkspace(workspace: Workspace): BudgetSeed[] {
  return workspace.domain === DEMO_WORKSPACE_DOMAIN ? demoHouseholdBudgets : defaultBudgets
}

/**
 * Seeds sample budgets per workspace (idempotent by workspace + name).
 *
 * Creating a budget triggers the afterChange hook, which seeds category groups
 * and categories via `seedCategories`.
 */
export async function seedBudgets(payload: Payload, options?: SeedRunOptions): Promise<void> {
  if (!options?.force && !config.database.seed.enabled) {
    return
  }

  const workspaces = await payload.find({
    collection: 'workspaces',
    pagination: false,
    overrideAccess: true,
  })

  if (workspaces.docs.length === 0) {
    payload.logger.warn(
      '🚨 [Budgets] No workspaces found — run `bun run db:seed workspaces` or create one in admin.',
    )
    return
  }

  await dedupeDuplicateBudgets(payload)

  for (const workspace of workspaces.docs) {
    const catalog = budgetsForWorkspace(workspace)

    for (const budgetSeed of catalog) {
      const lockKey = `budget:${workspace.id}:${budgetSeed.name}`

      await withSeedLock(lockKey, async () => {
        try {
          const exists = (
            await payload.find({
              collection: 'budgets',
              limit: 1,
              where: {
                and: [
                  { workspace: { equals: workspace.id } },
                  { name: { equals: budgetSeed.name } },
                ],
              },
              overrideAccess: true,
            })
          )?.totalDocs

          if (exists) {
            payload.logger.warn(
              `🚨 [Budgets] "${budgetSeed.name}" already exists for "${workspace.name}", skipping.`,
            )
            return
          }

          await payload.create({
            collection: 'budgets',
            data: {
              ...budgetSeed,
              workspace: workspace.id,
            },
            overrideAccess: true,
          })

          payload.logger.info(
            `✅ [Budgets] Created "${budgetSeed.name}" for workspace "${workspace.name}".`,
          )
        } catch (error) {
          payload.logger.error(
            `❌ [Budgets] Failed to create "${budgetSeed.name}" for "${workspace.name}": ${
              error instanceof Error ? error.message : 'Unknown error occurred.'
            }`,
          )
        }
      })
    }
  }
}
