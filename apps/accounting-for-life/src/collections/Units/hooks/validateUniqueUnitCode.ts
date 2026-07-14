import type { CollectionBeforeValidateHook } from 'payload'

import { getCollectionId } from '@/utils/getCollectionId'
import type { Unit } from '@/types'

/**
 * Enforce unique `code` per workspace (case-insensitive).
 */
export const validateUniqueUnitCode: CollectionBeforeValidateHook<Unit> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data

  const code = data.code?.trim()
  if (code) {
    data.code = code.toUpperCase()
  }

  const resolvedCode = data.code ?? originalDoc?.code
  const workspaceId = getCollectionId(data.workspace ?? originalDoc?.workspace)

  if (!resolvedCode || !workspaceId) {
    return data
  }

  const existing = await req.payload.find({
    collection: 'units',
    where: {
      and: [
        { workspace: { equals: workspaceId } },
        { code: { equals: resolvedCode } },
        ...(operation === 'update' && originalDoc?.id
          ? [{ id: { not_equals: originalDoc.id } }]
          : []),
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })

  if (existing.docs[0]) {
    throw new Error(`A unit with code "${resolvedCode}" already exists in this workspace`)
  }

  return data
}
