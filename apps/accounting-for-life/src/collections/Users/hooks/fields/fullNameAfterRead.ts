import type { FieldHook } from 'payload'

/**
 * Virtual `fullName` — join `firstName` + `lastName`, else `email`. Not persisted.
 * Requires `users.forceSelect` so relationship pickers load source fields.
 */
export const fullNameAfterRead: FieldHook = ({ siblingData }) => {
  if (!siblingData) return ''

  const name = [siblingData.firstName, siblingData.lastName].filter(Boolean).join(' ').trim()
  if (name) return name

  return siblingData.email?.trim() ?? ''
}
