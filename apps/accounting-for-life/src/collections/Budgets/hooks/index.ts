import { seedCategoriesAfterCreate } from './seedCategoriesAfterCreate'

export const hooks = {
  afterChange: [seedCategoriesAfterCreate],
}
