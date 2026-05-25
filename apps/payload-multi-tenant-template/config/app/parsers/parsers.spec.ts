import { describe, expect, it } from 'bun:test'

import { parseEnvBool } from './helpers'
import { parseSeedConfig } from './seed'
import { parseCorsOrigins } from './server'

describe('parseEnvBool', () => {
  it('returns default when unset', () => {
    const key = `TEST_BOOL_${Date.now()}`
    expect(parseEnvBool(key, false)).toBe(false)
    expect(parseEnvBool(key, true)).toBe(true)
  })

  it('parses truthy and falsy strings', () => {
    process.env.TEST_BOOL_PARSE = 'yes'
    expect(parseEnvBool('TEST_BOOL_PARSE', false)).toBe(true)
    process.env.TEST_BOOL_PARSE = '0'
    expect(parseEnvBool('TEST_BOOL_PARSE', true)).toBe(false)
    delete process.env.TEST_BOOL_PARSE
  })
})

describe('parseSeedConfig', () => {
  it('disables seeding when NODE_ENV=test even if DATA_SEED_ENABLED=1', () => {
    const prevNode = process.env.NODE_ENV
    const prevSeed = process.env.DATA_SEED_ENABLED

    process.env.NODE_ENV = 'test'
    process.env.DATA_SEED_ENABLED = '1'

    expect(parseSeedConfig()).toEqual({ enabled: false })

    if (prevNode === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = prevNode

    if (prevSeed === undefined) delete process.env.DATA_SEED_ENABLED
    else process.env.DATA_SEED_ENABLED = prevSeed
  })
})

describe('parseCorsOrigins', () => {
  const publicURL = 'https://app.example.com'
  const extraOrigin = 'https://admin.example.com'

  it('defaults to public URL only', () => {
    delete process.env.CORS_ORIGINS
    expect(parseCorsOrigins(publicURL)).toEqual([publicURL])
  })

  it('merges comma-separated origins and dedupes public URL', () => {
    process.env.CORS_ORIGINS = `${extraOrigin}, ${publicURL}`
    expect(parseCorsOrigins(publicURL)).toEqual([publicURL, extraOrigin])
    delete process.env.CORS_ORIGINS
  })
})
