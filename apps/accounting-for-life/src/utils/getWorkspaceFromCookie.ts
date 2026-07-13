import { parseCookies } from 'payload'
import { isNumber } from 'payload/shared'

/**
 * Returns the admin-selected workspace id from the `payload-tenant` cookie.
 *
 * The cookie name is defined by `@payloadcms/plugin-multi-tenant` (not configurable).
 */
export function getWorkspaceFromCookie(
  headers: Headers,
  idType: 'number' | 'text',
): null | number | string {
  const cookies = parseCookies(headers)
  const selectedWorkspace = cookies.get('payload-tenant') || null

  return selectedWorkspace
    ? idType === 'number' && isNumber(selectedWorkspace)
      ? parseFloat(selectedWorkspace)
      : selectedWorkspace
    : null
}
