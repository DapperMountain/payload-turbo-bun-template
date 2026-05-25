import { describe, expect, it } from 'bun:test'

import {
  allowAll,
  boolean,
  combineAccessResults,
  denyAll,
  evaluateAccessResults,
  isFilter,
  isPromise,
  requireAll,
  requireOne,
  withAuth,
} from '@/access/helpers'
import { accessArgs, systemAdminUser, tenantMemberUser } from '@/access/test'
import type { Access } from 'payload'

describe('allowAll', () => {
  it('always returns true', () => {
    expect(allowAll(accessArgs(null))).toBe(true)
    expect(allowAll(accessArgs(systemAdminUser))).toBe(true)
  })
})

describe('denyAll', () => {
  it('always returns false', () => {
    expect(denyAll(accessArgs(null))).toBe(false)
    expect(denyAll(accessArgs(systemAdminUser))).toBe(false)
  })
})

describe('isFilter', () => {
  it('narrows Where objects', () => {
    const where = { id: { equals: 'x' } }

    expect(isFilter(where)).toBe(true)
    expect(isFilter(true)).toBe(false)
    expect(isFilter(false)).toBe(false)
  })
})

describe('isPromise', () => {
  it('detects Promise-like values', () => {
    expect(isPromise(Promise.resolve(true))).toBe(true)
    expect(isPromise(true)).toBe(false)
    expect(isPromise({ id: { equals: 'x' } })).toBe(false)
  })
})

describe('combineAccessResults', () => {
  it('returns true when there are no Where filters', () => {
    expect(combineAccessResults([true, true], 'and')).toBe(true)
    expect(combineAccessResults([false, true], 'or')).toBe(true)
  })

  it('returns a single filter unchanged', () => {
    const where = { id: { equals: 'x' } }

    expect(combineAccessResults([true, where], 'and')).toEqual(where)
  })

  it('merges multiple filters with and or or', () => {
    const a = { id: { equals: 'x' } }
    const b = { tenant: { equals: 't' } }

    expect(combineAccessResults([a, b], 'and')).toEqual({ and: [a, b] })
    expect(combineAccessResults([a, b], 'or')).toEqual({ or: [a, b] })
  })
})

describe('evaluateAccessResults', () => {
  it('resolves sync and async access functions', async () => {
    const sync: Access = () => true
    const asyncFn: Access = async () => ({ id: { equals: 'async' } })
    const args = accessArgs(tenantMemberUser)

    await expect(evaluateAccessResults([sync, asyncFn], args)).resolves.toEqual([
      true,
      { id: { equals: 'async' } },
    ])
  })
})

describe('boolean', () => {
  const req = accessArgs(tenantMemberUser).req

  it('coerces boolean access results', async () => {
    await expect(boolean(() => true)({ req })).resolves.toBe(true)
    await expect(boolean(() => false)({ req })).resolves.toBe(false)
  })

  it('treats Where clauses as true', async () => {
    await expect(boolean(() => ({ id: { equals: 'x' } }))({ req })).resolves.toBe(true)
  })
})

describe('requireOne', () => {
  it('returns false when every function returns false', async () => {
    const deny: Access = () => false
    const composed = requireOne(deny, deny)

    await expect(composed(accessArgs())).resolves.toBe(false)
  })

  it('returns true when any function returns true', async () => {
    const allow: Access = () => true
    const deny: Access = () => false
    const composed = requireOne(deny, allow)

    await expect(composed(accessArgs())).resolves.toBe(true)
  })

  it('returns a Where clause when one function provides a filter', async () => {
    const deny: Access = () => false
    const scoped: Access = () => ({ id: { equals: 'x' } })
    const composed = requireOne(deny, scoped)

    await expect(composed(accessArgs())).resolves.toEqual({ id: { equals: 'x' } })
  })

  it('combines multiple Where clauses with or', async () => {
    const scopedA: Access = () => ({ id: { equals: 'x' } })
    const scopedB: Access = () => ({ tenant: { equals: 'tenant-a' } })
    const composed = requireOne(scopedA, scopedB)

    await expect(composed(accessArgs())).resolves.toEqual({
      or: [{ id: { equals: 'x' } }, { tenant: { equals: 'tenant-a' } }],
    })
  })
})

describe('requireAll', () => {
  it('returns false when any function returns false', async () => {
    const allow: Access = () => true
    const deny: Access = () => false
    const composed = requireAll(allow, deny)

    await expect(composed(accessArgs())).resolves.toBe(false)
  })

  it('returns true when every function returns true', async () => {
    const allow: Access = () => true
    const composed = requireAll(allow, allow)

    await expect(composed(accessArgs())).resolves.toBe(true)
  })

  it('returns a Where clause when one function provides a filter', async () => {
    const allow: Access = () => true
    const scoped: Access = () => ({ id: { equals: 'x' } })
    const composed = requireAll(allow, scoped)

    await expect(composed(accessArgs())).resolves.toEqual({ id: { equals: 'x' } })
  })

  it('combines multiple Where clauses with and', async () => {
    const scopedA: Access = () => ({ id: { equals: 'x' } })
    const scopedB: Access = () => ({ tenant: { equals: 'tenant-a' } })
    const composed = requireAll(scopedA, scopedB)

    await expect(composed(accessArgs())).resolves.toEqual({
      and: [{ id: { equals: 'x' } }, { tenant: { equals: 'tenant-a' } }],
    })
  })
})

describe('withAuth', () => {
  it('denies unauthenticated requests without calling inner logic', async () => {
    const inner: Access = () => true
    const composed = withAuth(inner)

    await expect(composed(accessArgs(null))).resolves.toBe(false)
  })

  it('returns true for system admins even when inner logic denies', async () => {
    const inner: Access = () => false
    const composed = withAuth(inner)

    await expect(composed(accessArgs(systemAdminUser))).resolves.toBe(true)
  })

  it('delegates to inner access for authenticated non-admins', async () => {
    const inner: Access = () => ({ id: { equals: 'scoped' } })
    const composed = withAuth(inner)

    await expect(composed(accessArgs(tenantMemberUser))).resolves.toEqual({
      id: { equals: 'scoped' },
    })
  })

  it('returns false when inner access denies a non-admin', async () => {
    const inner: Access = () => false
    const composed = withAuth(inner)

    await expect(composed(accessArgs(tenantMemberUser))).resolves.toBe(false)
  })
})
