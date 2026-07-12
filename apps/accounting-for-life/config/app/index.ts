/**
 * Zod-backed app configuration (env → typed `AppConfig`).
 *
 * @packageDocumentation
 */
import { withConfigFlags } from './helpers/config-flags'
import { loadAppConfig } from './load'

export type { AppConfigWithFlags } from './helpers/config-flags'
export type { AppConfig } from './schema'
export { withConfigFlags } from './helpers/config-flags'
export { appConfigSchema } from './schema'
export { loadAppConfig } from './load'
export { loadEnvFiles, loadTestEnvFile, prepareEnvForConfig } from './helpers/prepare-env'

/** Parsed config exported as `@config` default. */
const config = withConfigFlags(loadAppConfig())

export default config
