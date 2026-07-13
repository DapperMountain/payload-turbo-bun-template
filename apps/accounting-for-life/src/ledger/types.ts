import type { JournalEntry } from '@/types'

export type JournalEntryType = JournalEntry['type']
export type JournalEntryStatus = JournalEntry['status']

export type PostJournalLineInput = {
  account: string
  amount: number
  category?: string | null
  sortOrder?: number
}

export type PostJournalEntryInput = {
  workspace: string
  budget: string
  date: string
  memo?: string
  type: JournalEntryType
  lines: PostJournalLineInput[]
  transferGroupId?: string
}
