import type { CollectionBeforeChangeHook } from 'payload'

import type { Transaction } from '@/types'

import {
  validateTransactionLinesBalance,
  validateTransferEntries,
} from './validateTransactionLines'

export type PostingLineInput = {
  account: string
  amount: number
  category?: string | null
  sortOrder?: number
}

function normalizePostingLines(lines: PostingLineInput[]): PostingLineInput[] {
  return lines.map((line) => ({
    ...line,
    account: typeof line.account === 'string' ? line.account : (line.account as { id: string }).id,
    category:
      line.category == null
        ? undefined
        : typeof line.category === 'string'
          ? line.category
          : (line.category as { id: string }).id,
  }))
}

async function validatePostingAccounts(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  postingLines: PostingLineInput[],
  workspaceId: string,
  budgetId: string,
): Promise<void> {
  for (const line of postingLines) {
    const account = await req.payload.findByID({
      collection: 'accounts',
      id: line.account,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const accountWorkspace =
      typeof account.workspace === 'string' ? account.workspace : account.workspace?.id
    const accountBudget = typeof account.budget === 'string' ? account.budget : account.budget?.id

    if (accountWorkspace !== workspaceId) {
      throw new Error('All accounts must belong to the transaction workspace')
    }

    if (accountBudget !== budgetId) {
      throw new Error('All accounts must belong to the transaction budget')
    }
  }
}

function stashPostingLines(
  req: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['req'],
  context: Parameters<CollectionBeforeChangeHook<Transaction>>[0]['context'],
  key: 'postingLines' | 'replacePostingLines',
  postingLines: PostingLineInput[],
): void {
  req.context[key] = postingLines
  context[key] = postingLines
}

/**
 * Validates `postingLines` on create/update, stashes them on `context`, and strips them from persisted data.
 */
export const prepareTransactionPosting: CollectionBeforeChangeHook<Transaction> = async ({
  data,
  originalDoc,
  operation,
  context,
  req,
}) => {
  const rawLines = data?.postingLines
  const hasPostingLines = Array.isArray(rawLines) && rawLines.length > 0

  if (operation === 'update') {
    if (rawLines == null) {
      return data
    }

    if (!hasPostingLines) {
      const { postingLines: _removed, ...persisted } = data
      return persisted
    }

    const postingLines = normalizePostingLines(rawLines as PostingLineInput[])
    const type = (data.type ?? originalDoc?.type) ?? 'transaction'
    const workspaceId =
      typeof (data.workspace ?? originalDoc?.workspace) === 'string'
        ? (data.workspace ?? originalDoc?.workspace)
        : (data.workspace ?? originalDoc?.workspace)?.id
    const budgetId =
      typeof (data.budget ?? originalDoc?.budget) === 'string'
        ? (data.budget ?? originalDoc?.budget)
        : (data.budget ?? originalDoc?.budget)?.id

    if (!workspaceId || !budgetId) {
      throw new Error('Posted transactions require workspace and budget')
    }

    validateTransactionLinesBalance(postingLines)
    validateTransferEntries(type, postingLines)
    await validatePostingAccounts(req, postingLines, workspaceId as string, budgetId as string)

    stashPostingLines(req, context, 'replacePostingLines', postingLines)

    const { postingLines: _removed, ...persisted } = data
    return persisted
  }

  if (operation !== 'create' || !hasPostingLines) {
    return data
  }

  const postingLines = normalizePostingLines(rawLines as PostingLineInput[])
  const type = data.type ?? 'transaction'

  validateTransactionLinesBalance(postingLines)
  validateTransferEntries(type, postingLines)

  const workspaceId = typeof data.workspace === 'string' ? data.workspace : data.workspace?.id
  const budgetId = typeof data.budget === 'string' ? data.budget : data.budget?.id

  if (!workspaceId || !budgetId) {
    throw new Error('Posted transactions require workspace and budget')
  }

  await validatePostingAccounts(req, postingLines, workspaceId, budgetId)

  stashPostingLines(req, context, 'postingLines', postingLines)

  const { postingLines: _removed, ...persisted } = data

  return {
    ...persisted,
    status: 'posted',
  }
}
