/**
 * Payload collection registry.
 */
import type { CollectionConfig } from 'payload'

import Budgets from './Budgets'
import Categories from './Categories'
import CategoryGroups from './CategoryGroups'
import Accounts from './Accounts'
import JournalEntries from './JournalEntries'
import JournalLines from './JournalLines'
import Units from './Units'
import Users from './Users'
import Workspaces from './Workspaces'

const collections: CollectionConfig[] = [
  Users,
  Workspaces,
  Units,
  Budgets,
  CategoryGroups,
  Categories,
  Accounts,
  JournalEntries,
  JournalLines,
]

export default collections

export {
  Accounts,
  Budgets,
  Categories,
  CategoryGroups,
  JournalEntries,
  JournalLines,
  Units,
  Users,
  Workspaces,
}
