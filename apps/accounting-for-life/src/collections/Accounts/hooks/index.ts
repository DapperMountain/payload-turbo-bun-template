import { ensureCreditCardPaymentCategory } from './ensureCreditCardPaymentCategory'
import { validateAccountCategory } from './validateAccountCategory'
import { validateAccountSubtype } from './validateAccountSubtype'

// beforeChange runs first (subtype + category), then afterChange (auto-link on credit cards).
export const hooks = {
  beforeChange: [validateAccountSubtype, validateAccountCategory],
  afterChange: [ensureCreditCardPaymentCategory],
}
