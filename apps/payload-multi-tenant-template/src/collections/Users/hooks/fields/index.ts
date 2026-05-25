import { fullNameAfterRead } from './fullNameAfterRead'

/**
 * Field-level hook bundles keyed by field `name`. Spread onto the field config, e.g.
 * `{ name: 'fullName', type: 'text', ...fieldHooks.fullName }`.
 */
export const fieldHooks = {
  afterRead: [fullNameAfterRead],
}
