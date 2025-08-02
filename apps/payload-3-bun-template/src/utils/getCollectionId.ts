import { Config } from '@/types'
import type { CollectionSlug } from 'payload'

/**
 * Extracts the `id` from a collection object or returns the `id` directly.
 *
 * @template T - The type of the collection object.
 * @param objectOrId - Either a collection object containing an `id` field or a direct `id` string.
 * @returns The extracted `id` or `undefined` if the input is invalid.
 */
export const getCollectionId = <T extends Config['collections'][CollectionSlug]>(
  objectOrId: T | T['id'],
): T['id'] | undefined => (objectOrId && typeof objectOrId === 'object' ? objectOrId.id : objectOrId)
