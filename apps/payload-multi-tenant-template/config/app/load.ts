import { z } from 'zod'

import { prepareEnvForConfig } from './helpers/prepare-env'
import { type AppConfig, appConfigSchema } from './schema'

/**
 * Validates `process.env` with Zod and returns typed config.
 *
 * Calls {@link prepareEnvForConfig} first.
 *
 * @throws {z.ZodError} When required variables are missing or invalid.
 * @throws {Error} When parsers reject invalid values.
 */
export function loadAppConfig(): AppConfig {
  prepareEnvForConfig()

  try {
    const result = appConfigSchema.safeParse({})

    if (!result.success) {
      console.error('Invalid environment configuration:\n')
      console.error(z.prettifyError(result.error))
      throw result.error
    }

    return result.data
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error
    }

    if (error instanceof Error) {
      console.error(`Invalid environment configuration: ${error.message}`)
    }

    throw error
  }
}
