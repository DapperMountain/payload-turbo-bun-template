import { down as downPending, up as upPending } from './20260713_transaction_status_pending'
import { down as downCascade, up as upCascade } from './20260713_transaction_entries_cascade_delete'
import { down as downVoidOf, up as upVoidOf } from './20260713_drop_transaction_void_of'
import {
  down as downUnitKinds,
  up as upUnitKinds,
} from './20260714_unit_kinds_fiat_crypto_custom'

export const migrations = [
  {
    down: downPending,
    name: '20260713_transaction_status_pending',
    up: upPending,
  },
  {
    down: downCascade,
    name: '20260713_transaction_entries_cascade_delete',
    up: upCascade,
  },
  {
    down: downVoidOf,
    name: '20260713_drop_transaction_void_of',
    up: upVoidOf,
  },
  {
    down: downUnitKinds,
    name: '20260714_unit_kinds_fiat_crypto_custom',
    up: upUnitKinds,
  },
]
