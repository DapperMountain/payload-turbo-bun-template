import type { Workspace } from '@/types'
import config from '@config'
import type { Payload } from 'payload'

import { getCollectionId } from '@/utils'

import type { SeedRunOptions } from '../types'

/** Dev admin URL host — matches `NEXT_PUBLIC_SERVER_URL` / Docker port 3001. */
export const DEMO_WORKSPACE_DOMAIN = 'localhost:3001'

/** Second sample workspace — distinct domain for multi-workspace admin UI (selector needs 2+). */
export const SECOND_DEMO_WORKSPACE_DOMAIN = 'cabin.localhost'

export type WorkspaceSeed = Pick<Workspace, 'name' | 'description' | 'domain'>

/**
 * Sample workspaces for local development.
 *
 * `domain` drives login cookie selection (`setCookieBasedOnDomain`) on matching hosts.
 * Seed at least two workspaces so the Payload workspace filter appears in admin.
 */
export const sampleWorkspaces: WorkspaceSeed[] = [
  {
    name: 'Demo Household',
    description:
      'Primary sample household — full budget catalog (Household + Vacation) for local development.',
    domain: DEMO_WORKSPACE_DOMAIN,
  },
  {
    name: 'Lake Cabin',
    description:
      'Second sample workspace for exercising workspace switching and scoped collections in admin.',
    domain: SECOND_DEMO_WORKSPACE_DOMAIN,
  },
]

async function linkDemoUserToWorkspace(
  payload: Payload,
  workspaceId: string,
  workspaceName: string,
): Promise<void> {
  if (!config.database.seed.enabled) {
    return
  }

  const { user: demoUser } = config.database.seed

  const found = await payload.find({
    collection: 'users',
    limit: 1,
    where: { email: { equals: demoUser.email } },
    overrideAccess: true,
  })

  const doc = found.docs[0]

  if (!doc) {
    payload.logger.warn(
      `🚨 [Workspaces] Demo user "${demoUser.email}" not found — run user seed first or create the account.`,
    )
    return
  }

  const memberships = doc.workspaces ?? []
  const alreadyLinked = memberships.some(
    (row) => getCollectionId(row.workspace) === workspaceId,
  )

  if (alreadyLinked) {
    return
  }

  await payload.update({
    collection: 'users',
    id: doc.id,
    data: {
      workspaces: [
        ...memberships.map((row) => ({
          workspace: getCollectionId(row.workspace)!,
          roles: row.roles,
        })),
        { workspace: workspaceId, roles: ['WORKSPACE_ADMIN'] },
      ],
    },
    overrideAccess: true,
  })

  payload.logger.info(
    `✅ [Workspaces] Linked "${demoUser.email}" as WORKSPACE_ADMIN on "${workspaceName}".`,
  )
}

/**
 * Seeds sample workspace documents and links the demo user when user seed env is enabled.
 */
export async function seedWorkspaces(
  payload: Payload,
  options?: SeedRunOptions,
): Promise<void> {
  if (!options?.force && !config.database.seed.enabled) {
    return
  }

  for (const workspaceSeed of sampleWorkspaces) {
    try {
      const existing = await payload.find({
        collection: 'workspaces',
        limit: 1,
        where: { domain: { equals: workspaceSeed.domain } },
        overrideAccess: true,
      })

      let workspaceId = existing.docs[0]?.id

      if (workspaceId) {
        payload.logger.warn(
          `🚨 [Workspaces] Workspace with domain "${workspaceSeed.domain}" already exists, skipping create.`,
        )
      } else {
        const created = await payload.create({
          collection: 'workspaces',
          data: workspaceSeed,
          overrideAccess: true,
        })
        workspaceId = created.id
        payload.logger.info(`✅ [Workspaces] Created "${workspaceSeed.name}" (${workspaceSeed.domain}).`)
      }

      await linkDemoUserToWorkspace(payload, workspaceId, workspaceSeed.name)
    } catch (error) {
      payload.logger.error(
        `❌ [Workspaces] Failed to seed "${workspaceSeed.name}": ${
          error instanceof Error ? error.message : 'Unknown error occurred.'
        }`,
      )
    }
  }
}
