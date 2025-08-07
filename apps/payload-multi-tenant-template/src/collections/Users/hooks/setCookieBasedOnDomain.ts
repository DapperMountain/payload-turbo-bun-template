import type { CollectionAfterLoginHook } from 'payload'

import { generateCookie, getCookieExpiration } from 'payload'

export const setCookieBasedOnDomain: CollectionAfterLoginHook = async ({ req, user }) => {
  const tenant = await req.payload.find({
    collection: 'tenants',
    depth: 0,
    limit: 1,
    where: {
      domain: {
        equals: req.headers.get('host'),
      },
    },
  })

  // If a matching tenant is found, set the 'payload-tenant' cookie
  const tenantId = tenant?.docs?.[0]?.id

  if (!tenantId) return user

  const tenantCookie = generateCookie({
    name: 'payload-tenant',
    expires: getCookieExpiration({ seconds: 7200 }),
    path: '/',
    returnCookieAsObject: false,
    value: tenant?.docs?.[0]?.id,
  })

  // Merge existing responseHeaders with the new Set-Cookie header
  if (!req.responseHeaders) {
    req.responseHeaders = new Headers()
  }

  req.responseHeaders.append('Set-Cookie', tenantCookie as string)

  return user
}
