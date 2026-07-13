import { describe, expect, it } from 'bun:test'

import type { Workspace } from '@/types'
import { createWorkspace, deleteResourceById, findResourceByKey, payload } from '@/test'

describe('workspaces collection', () => {
  let workspaceId: string

  it('creates a document with expected fields', async () => {
    const doc = await createWorkspace(payload, {
      name: 'Test Workspace',
      description: 'Workspace for integration testing',
      domain: 'integration.example.com',
    })
    workspaceId = doc.id

    expect(doc.name).toBe('Test Workspace')
    expect(doc.description).toBe('Workspace for integration testing')
  })

  it('reads the document back', async () => {
    const doc = await findResourceByKey<Workspace>(payload, 'workspaces', 'name', 'Test Workspace')
    expect(doc.id).toBe(workspaceId)
    expect(doc.name).toBe('Test Workspace')
  })

  it('updates the document', async () => {
    const updatedDescription = 'Updated workspace for integration testing'
    const doc = await payload.update({
      collection: 'workspaces',
      id: workspaceId,
      data: { description: updatedDescription },
    })

    expect(doc.description).toBe(updatedDescription)
  })

  it('deletes the document', async () => {
    await deleteResourceById(payload, 'workspaces', workspaceId)
  })
})
