import { down as downPending, up as upPending } from './20260713_transaction_status_pending'
import { down as downCascade, up as upCascade } from './20260713_transaction_entries_cascade_delete'
import { down as downVoidOf, up as upVoidOf } from './20260713_drop_transaction_void_of'
import {
  down as downUnitKinds,
  up as upUnitKinds,
} from './20260714_unit_kinds_fiat_crypto_custom'
import {
  down as downAccountVisibility,
  up as upAccountVisibility,
} from './20260715_account_visibility'
import {
  down as downImportFields,
  up as upImportFields,
} from './20260715_transaction_import_fields'
import {
  down as downReportingCurrency,
  up as upReportingCurrency,
} from './20260715_workspace_reporting_currency'
import {
  down as downMemoToPayee,
  up as upMemoToPayee,
} from './20260715_rename_transaction_memo_to_payee'

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
  {
    down: downAccountVisibility,
    name: '20260715_account_visibility',
    up: upAccountVisibility,
  },
  {
    down: downImportFields,
    name: '20260715_transaction_import_fields',
    up: upImportFields,
  },
  {
    down: downReportingCurrency,
    name: '20260715_workspace_reporting_currency',
    up: upReportingCurrency,
  },
  {
    down: downMemoToPayee,
    name: '20260715_rename_transaction_memo_to_payee',
    up: upMemoToPayee,
  },
]
