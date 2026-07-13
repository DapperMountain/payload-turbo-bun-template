import { workspaceContentReadAccess } from './workspaceContent'

/** Lines are written only through the posting engine (`postJournalEntry`). */
export const journalLinesAccess = {
  read: workspaceContentReadAccess,
  create: () => false,
  update: () => false,
  delete: () => false,
}
