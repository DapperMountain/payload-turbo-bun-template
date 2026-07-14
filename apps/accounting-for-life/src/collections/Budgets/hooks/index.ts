import { enforceSingleDefaultBudget } from './enforceSingleDefaultBudget'
import { grantBudgetMembershipOnCreate } from './grantBudgetMembershipOnCreate'
import { removeBudgetMembershipsOnDelete } from './removeBudgetMembershipsOnDelete'
import { seedCategoriesAfterCreate } from './seedCategoriesAfterCreate'

export const hooks = {
  beforeChange: [enforceSingleDefaultBudget],
  beforeDelete: [removeBudgetMembershipsOnDelete],
  afterChange: [grantBudgetMembershipOnCreate, seedCategoriesAfterCreate],
}
