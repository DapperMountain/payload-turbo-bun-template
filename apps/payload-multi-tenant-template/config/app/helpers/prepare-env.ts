import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isTestRuntime } from './is-test-runtime'

/** App package root (`apps/payload-multi-tenant-template`), regardless of process cwd. */
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

function loadEnvFile(filename: string): void {
  const path = join(APP_ROOT, filename)

  if (!existsSync(path)) {
    return
  }

  const content = readFileSync(path, 'utf8')

  for (const line of content.split('\n')) {
    const parsed = parseEnvLine(line)

    if (!parsed || process.env[parsed.key]?.trim()) {
      continue
    }

    setEnv(parsed.key, parsed.value)
  }
}

/**
 * Loads `.env` then `.env.local` from the app package root into `process.env`.
 *
 * Does not override variables already set (shell / CI / Docker wins).
 */
export function loadEnvFiles(): void {
  loadEnvFile('.env')
  loadEnvFile('.env.local')
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
