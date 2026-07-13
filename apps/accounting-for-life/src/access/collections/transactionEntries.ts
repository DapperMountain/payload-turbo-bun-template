import { workspaceContentReadAccess } from './workspaceContent'

/** Legs are written only through the transactions create hook (`postingLines`). */
export const transactionEntriesAccess = {
  read: workspaceContentReadAccess,
  create: () => false,
  update: () => false,
  delete: () => false,
}
