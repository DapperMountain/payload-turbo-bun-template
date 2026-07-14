import { workspaceContentReadAccess } from './workspaceContent'

/** Legs are written only through the transactions create/update hooks (`entries`). */
export const transactionEntriesAccess = {
  read: workspaceContentReadAccess,
  create: () => false,
  update: () => false,
  delete: () => false,
}
