import { parseCookies } from 'payload'

/** Active frontend budget id from the `payload-budget` cookie. */
export function getBudgetFromCookie(headers: Headers): string | null {
  const cookies = parseCookies(headers)
  return cookies.get('payload-budget') || null
}
