import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isTestRuntime } from './is-test-runtime'

/** App package root (`apps/accounting-for-life`), regardless of process cwd. */
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const eq = trimmed.indexOf('=')

  if (eq === -1) {
    return null
  }

  const key = trimmed.slice(0, eq).trim()
  let value = trimmed.slice(eq + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

function setEnv(key: string, value: string): void {
  ;(process.env as Record<string, string | undefined>)[key] = value
}

function loadEnvFile(filename: string, options?: { override?: boolean }): void {
  const path = join(APP_ROOT, filename)

  if (!existsSync(path)) {
    return
  }

  const content = readFileSync(path, 'utf8')

  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line)

    if (!parsed) {
      continue
    }

    const existing = process.env[parsed.key]?.trim()

    // Shell / Compose / CI env wins — never overwrite keys set before file load.
    if (inheritedEnvKeys.has(parsed.key)) {
      continue
    }

    if (!options?.override && existing) {
      continue
    }

    setEnv(parsed.key, parsed.value)
  }
}

/** Keys present in `process.env` before any app env file is loaded. */
const inheritedEnvKeys = new Set(
  Object.keys(process.env).filter((key) => process.env[key]?.trim()),
)

/**
 * Loads `.env` then `.env.local` from the app package root into `process.env`.
 *
 * `.env.local` overrides `.env` for the same key. Variables already set in the
 * environment (Compose `env_file`, shell exports, CI) are never overwritten.
 */
export function loadEnvFiles(): void {
  loadEnvFile('.env')
  loadEnvFile('.env.local', { override: true })
}

/**
 * Loads `.env.test` when the Bun test runner is active.
 *
 * Local: copy [`.env.test.example`](../../../.env.test.example) → `.env.test`.
 * CI / Docker: set the same keys in the environment (no file required).
 */
export function loadTestEnvFile(): void {
  loadEnvFile('.env.test')
}

/**
 * Populates `process.env` from app env files before Zod parse.
 *
 * Idempotent — safe from test preload and {@link loadAppConfig}.
 */
export function prepareEnvForConfig(): void {
  loadEnvFiles()

  if (!isTestRuntime()) {
    return
  }

  loadTestEnvFile()

  if (!process.env.NODE_ENV?.trim()) {
    setEnv('NODE_ENV', 'test')
  }
}
