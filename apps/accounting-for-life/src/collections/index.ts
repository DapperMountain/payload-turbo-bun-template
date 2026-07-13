/**
 * Payload collection registry.
 */
import type { CollectionConfig } from 'payload'

import Budgets from './Budgets'
import Categories from './Categories'
import CategoryGroups from './CategoryGroups'
import Users from './Users'
import Workspaces from './Workspaces'

const collections: CollectionConfig[] = [Users, Workspaces, Budgets, CategoryGroups, Categories]

export default collections

export { Budgets, Categories, CategoryGroups, Users, Workspaces }
