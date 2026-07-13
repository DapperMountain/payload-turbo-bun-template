/**
 * Payload collection registry.
 */
import type { CollectionConfig } from 'payload'

import Budgets from './Budgets'
import Categories from './Categories'
import CategoryGroups from './CategoryGroups'
import EnvelopeBalances from './EnvelopeBalances'
import Accounts from './Accounts'
import TransactionEntries from './TransactionEntries'
import Transactions from './Transactions'
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
  EnvelopeBalances,
  Accounts,
  Transactions,
  TransactionEntries,
]

export default collections

export {
  Accounts,
  Budgets,
  Categories,
  CategoryGroups,
  EnvelopeBalances,
  TransactionEntries,
  Transactions,
  Units,
  Users,
  Workspaces,
}
