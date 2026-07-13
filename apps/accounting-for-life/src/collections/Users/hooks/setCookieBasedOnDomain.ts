import type { CollectionAfterLoginHook } from 'payload'

import { generateCookie, getCookieExpiration } from 'payload'

export const setCookieBasedOnDomain: CollectionAfterLoginHook = async ({ req, user }) => {
  // Match request host to a workspace domain so admin opens with the right tenant selected.
  const workspaces = await req.payload.find({
    collection: 'workspaces',
    depth: 0,
    limit: 1,
    where: {
      domain: {
        equals: req.headers.get('host'),
      },
    },
  })

  // If a matching workspace is found, set the plugin's `payload-tenant` cookie
  const workspaceId = workspaces?.docs?.[0]?.id

  if (!workspaceId) return user

  const workspaceCookie = generateCookie({
    name: 'payload-tenant',
    expires: getCookieExpiration({ seconds: 7200 }),
    path: '/',
    returnCookieAsObject: false,
    value: workspaceId,
  })

  if (!req.responseHeaders) {
    req.responseHeaders = new Headers()
  }

  req.responseHeaders.append('Set-Cookie', workspaceCookie as string)

  return user
}
