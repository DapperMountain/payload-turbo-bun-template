import { describe, expect, it } from 'bun:test'

import type { Tenant } from '@/types'
import { createTenant, deleteResourceById, findResourceByKey, payload } from '@/test'

describe('tenants collection', () => {
  let tenantId: string

  it('creates a document with expected fields', async () => {
    const doc = await createTenant(payload, {
      name: 'Test Tenant',
      description: 'Tenant for integration testing',
      domain: 'integration.example.com',
    })
    tenantId = doc.id

    expect(doc.name).toBe('Test Tenant')
    expect(doc.description).toBe('Tenant for integration testing')
  })

  it('reads the document back', async () => {
    const doc = await findResourceByKey<Tenant>(payload, 'tenants', 'name', 'Test Tenant')
    expect(doc.id).toBe(tenantId)
    expect(doc.name).toBe('Test Tenant')
  })

  it('updates the document', async () => {
    const updatedDescription = 'Updated tenant for integration testing'
    const doc = await payload.update({
      collection: 'tenants',
      id: tenantId,
      data: { description: updatedDescription },
    })

    expect(doc.description).toBe(updatedDescription)
  })

  it('deletes the document', async () => {
    await deleteResourceById(payload, 'tenants', tenantId)
  })
})
