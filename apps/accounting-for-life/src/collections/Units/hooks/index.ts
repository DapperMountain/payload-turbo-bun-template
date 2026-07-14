import { validateUniqueUnitCode } from './validateUniqueUnitCode'

export const hooks = {
  beforeValidate: [validateUniqueUnitCode],
}
