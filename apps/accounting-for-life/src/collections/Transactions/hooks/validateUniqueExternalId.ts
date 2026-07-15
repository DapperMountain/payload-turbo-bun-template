import type { CollectionBeforeValidateHook } from 'payload'

import type { Transaction } from '@/types'
import { getCollectionId } from '@/utils/getCollectionId'

/**
 * When `externalId` is set, it must be unique within the workspace (US-6.2).
 * Empty / whitespace values are cleared so uniqueness only applies to real ids.
 */
export const validateUniqueExternalId: CollectionBeforeValidateHook<Transaction> = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data

  if (typeof data.externalId === 'string') {
    const trimmed = data.externalId.trim()
    data.externalId = trimmed.length > 0 ? trimmed : null
  }

  const externalId =
    data.externalId !== undefined ? data.externalId : (originalDoc?.externalId ?? null)

  if (!externalId) {
    return data
  }

  const workspaceId = getCollectionId(data.workspace ?? originalDoc?.workspace)
  if (!workspaceId) {
    return data
  }

  const existing = await req.payload.find({
    collection: 'transactions',
    where: {
      and: [
        { workspace: { equals: workspaceId } },
        { externalId: { equals: externalId } },
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
    throw new Error(
      `A transaction with externalId "${externalId}" already exists in this workspace`,
    )
  }

  return data
}
