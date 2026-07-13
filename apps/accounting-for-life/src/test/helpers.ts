import type { User, Workspace } from '@/types'
import { expect } from 'bun:test'
import { CollectionSlug, Payload } from 'payload'

export const createWorkspace = async (
  payload: Payload,
  data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const response = await payload.create({
    collection: 'workspaces',
    data,
  })

  expect(response).toHaveProperty('id')

  return response
}

/** @deprecated Use {@link createWorkspace}. */
export const createTenant = createWorkspace

export const findResourceByKey = async <T>(
  payload: Payload,
  collection: CollectionSlug,
  key: string,
  value: unknown,
): Promise<T> => {
  const response = await payload.find({
    collection,
    where: { [key]: { equals: value } },
  })

  expect(response.docs.length).toBeGreaterThan(0)

  return response.docs[0] as unknown as T
}

export const deleteResourceById = async (
  payload: Payload,
  collection: CollectionSlug,
  id: string,
) => {
  await payload.delete({
    collection,
    id,
  })

  const verifyResponse = await payload.find({
    collection,
    where: { id: { equals: id } },
  })

  expect(verifyResponse.docs.length).toBe(0)
}

export const createUser = async (
  payload: Payload,
  data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
    workspaces: { workspace: string; roles: string[] }[]
  },
) => {
  const response = await payload.create({
    collection: 'users',
    data,
  })

  expect(response).toHaveProperty('id')
  return response
}
