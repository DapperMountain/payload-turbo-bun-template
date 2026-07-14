import { enforceSingleDefaultBudget } from './enforceSingleDefaultBudget'
import { seedCategoriesAfterCreate } from './seedCategoriesAfterCreate'

export const hooks = {
  beforeChange: [enforceSingleDefaultBudget],
  afterChange: [seedCategoriesAfterCreate],
}
