import type { CollectionConfig } from 'payload'
import { setCookieBasedOnDomain } from './setCookieBasedOnDomain'

/**
 * Defines hooks for the collection.
 *
 * @see {@link https://payloadcms.com/docs/hooks/collections PayloadCMS Collection Hooks}
 */
export const hooks: CollectionConfig['hooks'] = {
  afterLogin: [setCookieBasedOnDomain],
}
