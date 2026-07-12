import { z } from 'zod'

/** Read `process.env` at call time (during `parse`, not at module import). */
export const readEnv = (key: string): string | undefined => process.env[key]

const TRUTHY = new Set(['true', '1', 'yes', 'on'])
const FALSY = new Set(['false', '0', 'no', 'off'])

/**
 * Parses common env string booleans. Returns `defaultValue` when unset.
 *
 * @throws {Error} When the value is set but not recognized.
 */
export function parseEnvBool(key: string, defaultValue = false): boolean {
  const raw = readEnv(key)

  if (raw === undefined || raw.trim() === '') {
    return defaultValue
  }

  const normalized = raw.trim().toLowerCase()

  if (TRUTHY.has(normalized)) return true
  if (FALSY.has(normalized)) return false

  throw new Error(
    `Invalid boolean for ${key}="${raw}". Use true/false, 1/0, yes/no, or on/off.`,
  )
}

/** Required non-empty string from `process.env[key]`. */
export function requiredEnv(key: string) {
  return z
    .string()
    .default(() => readEnv(key) ?? '')
    .refine((value) => value.length > 0, {
      message: `Missing required environment variable: ${key}`,
    })
    .describe(key)
}

/** Email from `process.env[key]` (required). */
export function requiredEmailEnv(key: string) {
  return z
    .email({ error: `Invalid email for ${key}` })
    .default(() => readEnv(key) ?? '')
    .refine((value) => value.length > 0, {
      message: `Missing required environment variable: ${key}`,
    })
    .describe(key)
}

/** `NODE_ENV`-style enum from `process.env[key]`, with fallback when unset. */
export function enumEnv<const T extends readonly [string, ...string[]]>(
  key: string,
  allowed: T,
  fallback: T[number],
) {
  return z
    .enum(allowed)
    .default(() => {
      const value = readEnv(key)

      if (value === undefined || value === '') {
        return fallback
      }

      return value as T[number]
    })
    .describe(key)
}

/** Boolean from `process.env[key]` (see {@link parseEnvBool}). */
export function boolEnv(key: string, defaultValue = false) {
  return z
    .boolean()
    .default(() => parseEnvBool(key, defaultValue))
    .describe(key)
}
