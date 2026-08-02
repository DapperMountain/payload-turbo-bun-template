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
import { down as downEntryNotes, up as upEntryNotes } from './20260715_entry_notes'
import {
  down as downQuoteUnit,
  up as upQuoteUnit,
} from './20260715_transaction_quote_unit'
import {
  down as downEconomicKind,
  up as upEconomicKind,
} from './20260718_transaction_economic_kind'
import { down as downEntryPayee, up as upEntryPayee } from './20260801_entry_payee'
import {
  down as downAccountIsSystemDefault,
  up as upAccountIsSystemDefault,
} from './20260801_account_is_system_default'

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
  {
    down: downEntryNotes,
    name: '20260715_entry_notes',
    up: upEntryNotes,
  },
  {
    down: downQuoteUnit,
    name: '20260715_transaction_quote_unit',
    up: upQuoteUnit,
  },
  {
    down: downEconomicKind,
    name: '20260718_transaction_economic_kind',
    up: upEconomicKind,
  },
  {
    down: downEntryPayee,
    name: '20260801_entry_payee',
    up: upEntryPayee,
  },
  {
    down: downAccountIsSystemDefault,
    name: '20260801_account_is_system_default',
    up: upAccountIsSystemDefault,
  },
]
