import type { AppConfig } from '../schema'

/** Parsed {@link AppConfig} plus convenience flags and aliases used in app code. */
export type AppConfigWithFlags = AppConfig & {
  /**
   * @deprecated Use `config.server.publicURL`. Kept for existing imports.
   */
  baseURL: string
  isProduction: boolean
  isDevelopment: boolean
  isTest: boolean
}

/**
 * Adds `isTest` / `isProduction` flags and the `baseURL` alias to parsed config.
 */
export function withConfigFlags(config: AppConfig): AppConfigWithFlags {
  if (config.env === 'test' && !process.env.DATABASE_URL_TEST) {
    console.warn(
      '[config] NODE_ENV=test but DATABASE_URL_TEST is unset — using DATABASE_URL. Prefer a dedicated test database.',
    )
  }

  return {
    ...config,
    baseURL: config.server.publicURL,
    isProduction: config.env === 'production',
    isDevelopment: config.env === 'development',
    isTest: config.env === 'test',
  }
}
