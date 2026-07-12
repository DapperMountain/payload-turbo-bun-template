import { parseCookies } from 'payload'
import { isNumber } from 'payload/shared'

/**
 * Returns the admin-selected tenant id from the `payload-tenant` cookie.
 *
 * Used by the multi-tenant plugin for list filters and relationship options — not
 * as the default API access boundary (see {@link userCanAccessActiveTenant}).
 *
 * @param headers - Request headers (e.g. `req.headers`).
 * @param idType - Payload database id type (`number` or `text`).
 */
export function getTenantFromCookie(
  headers: Headers,
  idType: 'number' | 'text',
): null | number | string {
  const cookies = parseCookies(headers)
  const selectedTenant = cookies.get('payload-tenant') || null

  return selectedTenant
    ? idType === 'number' && isNumber(selectedTenant)
      ? parseFloat(selectedTenant)
      : selectedTenant
    : null
}
