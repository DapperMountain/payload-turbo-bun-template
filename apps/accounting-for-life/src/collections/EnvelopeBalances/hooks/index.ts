import { validateEnvelopeBalance } from './validateEnvelopeBalance'

export const hooks = {
  beforeChange: [validateEnvelopeBalance],
}
