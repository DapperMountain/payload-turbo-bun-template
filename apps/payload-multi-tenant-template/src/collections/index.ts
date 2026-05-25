/**
 * Payload collection registry.
 *
 * Each collection lives in `collections/<Name>/index.ts`. See `collections/README.md`
 * and `docs/CODE_CONVENTIONS.md`.
 */
import type { CollectionConfig } from 'payload'

import Tenants from './Tenants'
import Users from './Users'

const collections: CollectionConfig[] = [Users, Tenants]

export default collections

export { Tenants, Users }
