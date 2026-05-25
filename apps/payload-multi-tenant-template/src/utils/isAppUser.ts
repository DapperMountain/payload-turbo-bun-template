import type { PayloadMcpApiKey, User } from '@/types'

/** Authenticated principal from Payload (`users` or MCP API keys). */
export type AuthPrincipal = User | PayloadMcpApiKey

/**
 * Narrows `req.user` to the app `users` collection (excludes MCP API key auth).
 */
export function isAppUser(principal: AuthPrincipal | null | undefined): principal is User {
  return principal != null && principal.collection === 'users'
}
