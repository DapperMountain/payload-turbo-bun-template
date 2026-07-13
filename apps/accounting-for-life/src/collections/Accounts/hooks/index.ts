import { ensureCreditCardPaymentCategory } from './ensureCreditCardPaymentCategory'
import { validateAccountCategory } from './validateAccountCategory'

// beforeChange runs first (validate/strip category), then afterChange (auto-link on credit cards).
export const hooks = {
  beforeChange: [validateAccountCategory],
  afterChange: [ensureCreditCardPaymentCategory],
}
