# API-first design

Accounting for Life is built on **Payload CMS**. The **REST and GraphQL APIs** (plus MCP when enabled) are the canonical contract for creating and mutating data. The Next.js frontend, future mobile clients, and CLI tools must all use the same paths — not parallel business logic in `app/(frontend)/actions/`.

## Principles

| Layer | Responsibility |
|-------|----------------|
| **Collections + hooks** | Validation, defaults, side effects (posting legs, envelope rules, budget defaults) |
| **Access control** (`src/access/`) | Who may create/read/update/delete; workspace scoping |
| **Virtual fields** | Accept structured input on create/update that is **not** stored on the document (e.g. `entries`) |
| **Next.js server actions** | Session auth, active workspace/budget cookies (UI defaults only), `revalidatePath` — **not** domain rules or write authority |
| **Frontend components** | Form state, display, UX helpers — build payloads the API already accepts |

When adding a feature, ask: *“Would a REST client sending the same JSON get the same result and errors?”* If not, move logic into Payload.

## Transactions (ledger)

### Canonical create / update

Post money movement through **`transactions`** with the virtual **`entries`** array. Hooks validate balance, transfer rules, account/budget/workspace alignment, and category budget; then **`afterChange`** writes **`transaction-entries`**.

**Do not** create `transaction-entries` directly from clients — collection access blocks writes, and legs are owned by the transaction hooks.

On **read**, the same `entries` array is populated by an `afterRead` hook from stored `transaction-entries`. The internal join field (`entryJoin`) is hidden from API responses.

#### Example: transfer (REST)

```http
POST /api/transactions
Content-Type: application/json

{
  "workspace": "<workspace-uuid>",
  "budget": "<budget-uuid>",
  "date": "2026-07-12T20:00:00.000Z",
  "type": "transfer",
  "entries": [
    { "account": "<checking-uuid>", "amount": -100 },
    { "account": "<savings-uuid>", "amount": 100 }
  ]
}
```

- `entries` on create sets **`status: posted`** (hook) and creates balanced legs.
- Omit `entries` to create a **pending** header only.
- Amounts are **signed** (negative = credit to the account, positive = debit) per account classification rules in the UI.

#### Example: categorize a posted transaction (classical DE)

Cash/liability leg stays uncategorized; the category tags the balancing system **Budget expenses** / **Budget income** P&L leg.

```http
PATCH /api/transactions/<id>
Content-Type: application/json

{
  "entries": [
    { "account": "<checking-uuid>", "amount": -25 },
    { "account": "<budget-expenses-uuid>", "amount": 25, "category": "<groceries-uuid>" }
  ]
}
```

Hooks replace all legs when `entries` is supplied on update.

### Hook pipeline (`collections/Transactions/hooks/`)

| Hook / endpoint | Role |
|------|------|
| `validateUniqueExternalId` (`beforeValidate`) | Trim `externalId`; reject duplicates within a workspace |
| `prepareTransactionPosting` (`beforeChange`) | Normalize `date`; validate `entries`; strip virtual field from persisted doc; stash lines on `context` |
| `shapeTransactionEntriesOnRead` (`afterRead`) | Populate virtual `entries` from `entryJoin`; remove `entryJoin` from response |
| `syncTransactionEntries` (`afterChange`) | Create or replace `transaction-entries` from stashed lines |
| `removeTransactionEntriesOnDelete` (`beforeDelete`) | Cascade-delete legs |
| `POST …/transactions/match` | Match/merge manual ↔ import (US-6.1); see below |

Validation includes:

- Double-entry balance: same-unit journals require `Σ amount ≈ 0`; mixed-unit journals require Σ amounts in the **quote** unit ≈ 0 (via `fxRate` = quote per 1 account unit on each cross-quote leg)
- When `quoteUnit` differs from workspace `reportingCurrency`, `quoteToReportingRate` (reporting per 1 quote) is required so `reportingAmount` can be snapshotted
- Transfers cannot include categories
- Accounts belong to transaction workspace and budget
- Categories on lines belong to transaction workspace and budget

#### Example: mixed-currency transfer (quote = reporting USD)

```http
POST /api/transactions
Content-Type: application/json

{
  "workspace": "<workspace-uuid>",
  "budget": "<budget-uuid>",
  "date": "2026-07-12T20:00:00.000Z",
  "type": "transfer",
  "entries": [
    { "account": "<eur-checking>", "amount": -10, "fxRate": 1.1 },
    { "account": "<usd-checking>", "amount": 11 }
  ]
}
```

`-10 EUR × 1.1 + 11 USD = 0` in quote (= reporting). Unequal native amounts with balanced quote amounts is required when units differ.

#### Example: quote ≠ reporting (balance in EUR, snapshot to USD)

```http
POST /api/transactions
Content-Type: application/json

{
  "workspace": "<workspace-uuid>",
  "budget": "<budget-uuid>",
  "date": "2026-07-12T20:00:00.000Z",
  "type": "transfer",
  "quoteUnit": "<eur-unit>",
  "quoteToReportingRate": 1.1,
  "entries": [
    { "account": "<eur-checking>", "amount": -10 },
    { "account": "<usd-checking>", "amount": 12, "fxRate": 0.8333333333 }
  ]
}
```

`-10 + 12 × (10/12) = 0` EUR quote; `reportingAmount` uses × `1.1` USD per EUR.

#### Example: crypto swap with exchange fee (category, not a fee account)

```http
POST /api/transactions
Content-Type: application/json

{
  "workspace": "<workspace-uuid>",
  "budget": "<budget-uuid>",
  "date": "2026-07-12T20:00:00.000Z",
  "type": "transaction",
  "entries": [
    { "account": "<xrp-wallet>", "amount": -100, "fxRate": 0.5, "payee": "Kraken" },
    { "account": "<xlm-wallet>", "amount": 200, "fxRate": 0.25 },
    { "account": "<usd-checking>", "amount": -5 },
    {
      "account": "<budget-expenses-uuid>",
      "amount": 5,
      "category": "<financial-fees>",
      "payee": "Kraken"
    }
  ]
}
```

`-100 × 0.5 + 200 × 0.25 − 5 + 5 = 0` reporting. The exchange name rides on the **give leg** (`payee: "Kraken"`); the fee is Checking −5 balanced by the system **Budget expenses** account with category **Financial Fees** and its own merchant. There is no transaction-level `payee` — every merchant is a line value (see ATM example below).

#### Example: ATM withdrawal with fee (line payee)

```http
POST /api/transactions
Content-Type: application/json

{
  "workspace": "<workspace-uuid>",
  "budget": "<budget-uuid>",
  "date": "2026-08-01T16:00:00.000Z",
  "type": "transaction",
  "entries": [
    { "account": "<checking-uuid>", "amount": -105 },
    { "account": "<cash-uuid>", "amount": 100 },
    {
      "account": "<budget-expenses-uuid>",
      "amount": 5,
      "category": "<financial-fees>",
      "payee": "ATM Co"
    }
  ]
}
```

Checking outflows $105; $100 lands in Cash (transfer leg, no entry payee); $5 fee is a classical P&L leg on **Budget expenses** with merchant **ATM Co**. When several merchants appear on lines, the register joins them (`A · B`).

Shared helpers live under `collections/Transactions/lib/` (e.g. `applyCategoryToEntries` for rebuilding lines when changing category).

### Why `transaction-entries` stays a separate collection

Legs are **not** embedded on the transaction document because they must be:

- Queryable by account (register filters, running balances)
- Scoped per workspace with their own fields (`unit`, `reportingAmount`, `fxRate`)
- Owned exclusively by transaction hooks (direct client writes blocked)

The virtual `entries` field gives REST clients a **symmetric read/write** shape without sacrificing query performance.

### What the Next.js UI does

Server actions in `app/(frontend)/actions/transactions.ts` call `payload.create` / `payload.update` with the same shapes as REST. They add:

- `requireAppUser` + active workspace check
- `revalidatePath` for RSC caches

Notes live on **entries** (optional per leg). When exactly one entry has a note, the register bubbles it onto the primary row. There is no transaction-header `notes` field. The consumer swap UI shows one note for the give/receive pair and persists it on the **give** leg (receive cleared); other lines keep their own notes.

**`payee` on entries** is the only payee in the schema — a merchant name for that leg (payment P&L leg, allocate category lines, journal “other” lines, swap sides). `transactions.payee` was dropped in `20260802_drop_transaction_payee`. Transfer destinations stay as account legs / `__transfer__` payee drafts in the editor — not duplicated as entry `payee`.

**Counterparty (posted `type: transaction`):** every categorized (P&L/fee) entry must have a merchant `payee`. Cash/wallet legs stay account-only. Editor lines (allocate splits, swap sides/other lines) each need a merchant or transfer/account. Pure `type: transfer` books use destination accounts (no merchant required). Pending headers without entries stay loose. The single Payee control on the payment body writes the implied P&L (or transfer) line; allocate and fee lines set per-line payees.

The register UI builds `entries` in the browser via **Standard** and **Split** tabs — that is **presentation**. The **rules** run in hooks regardless of client.

**Editor bodies (US-5.1):** one posting pipeline (`entries`); no Swap tab. Consumer UI uses three bodies in one dialog: **payment** (account / payee / amount / category; **Add line** → allocate), **exchange** / **journal** (grouped swap: give/receive + optional other lines for fees/third-party payees; one swap note; each side picks a wallet account plus an optional merchant-only payee — no header payee control). Mixed-unit rates derive from amounts; reporting valuation may be deferred. Register: **one row per transaction header** (transfers included); payee column shows entry merchants (e.g. Kraken) and is blank for pure transfers. Soft-nav to `/transactions/[id]` overlays the register via intercepting `@modal`.

**Economic kind (display):** Register and detail badges derive activity (`spend` / `earn` / `transfer` / account-scoped `withdraw`/`deposit`). Cash↔holding moves are ambiguous (`buy` / `sell` / `transfer`) — optional header `economicKind` stores the user’s confirmation when shown.

## Budget field on writes (US-1.3)

Budget-owned collections (`accounts`, `transactions`, `categories`, `category-groups`, `envelope-balances`) require a body **`budget`**. Access checks membership on that id for create/update. The `payload-budget` cookie only selects which budget the Next UI opens — it is not applied to Local/REST writes.

## Currencies & FX (Epic 2)

- **`units.kind`:** `fiat` | `crypto` | `custom`. Codes are unique per workspace (normalized to uppercase).
- **`workspaces.reportingCurrency`:** relationship to a unit in that workspace (seed sets USD) — portfolio / budget numeraire.
- **`transactions.quoteUnit`:** optional valuation unit for the journal (effective quote = `quoteUnit ?? reportingCurrency`).
- **`transactions.quoteToReportingRate`:** required when quote ≠ reporting (reporting per 1 quote).
- **Posting:** `writeTransactionEntries` snapshots entry `fxRate` (quote per 1 native) and `reportingAmount = amount × rateToQuote × quoteToReportingRate`. Same unit as quote → rate `1`.
- **Balance:** Same-unit → `Σ amount ≈ 0`. Mixed-unit → Σ quote amounts ≈ 0 (see mixed-currency examples above).

## Import / sync footholds (US-6.2)

On `transactions`:

| Field | Notes |
|-------|--------|
| `source` | `manual` (default) \| `import` |
| `externalId` | Optional institution/import id; **unique per workspace** when set (`validateUniqueExternalId`) |
| `importBatch` | Optional batch/run/file id for grouping imports |

### Match / merge (US-6.1)

**Canonical:** `POST /api/transactions/match` with body `{ "ids": ["<a>", "<b>"] }` (also Local API via `matchAndMergeTransactions`).

Rules:

- Exactly one **import** row (`source: import`) and one **manual** row
- Same workspace and budget
- **Keep** the manual row; **delete** the import row after transferring identity
- Survivor gets `source: import`, `externalId` / `importBatch` from the import (when keep lacks them)
- Bank `date` from the import; keep existing `payee` / `notes` when set
- If keep is still `pending` and absorb is `posted`, adopt absorb's `entries` (posts the survivor)
- Conflicting `externalId` values are rejected

Frontend bulk **Match** calls the same merge helper through a thin server action.

## Other collections

| Collection | API-first notes |
|------------|-----------------|
| **accounts** | Credit-card payment category rules in hooks; balance computed from posted legs (not stored); required `unit` is the account currency; `visibility` (`all_members` \| `admins`) filters account / transaction / entry reads (US-3.2) |
| **budgets** | `enforceSingleDefaultBudget` hook — only one `isDefault` per workspace |
| **envelope-balances** | `validateEnvelopeBalance` hook — category must match budget; income categories rejected |
| **transaction-entries** | Read-oriented for clients; writes via transaction hooks; stores FX snapshot fields |

## Server actions (intentionally thin)

| Action file | Payload calls | Next-only concerns |
|-------------|---------------|------------------|
| `transactions.ts` | `create` / `update` / `delete` / match-merge helper on `transactions` | Auth, workspace, revalidation |
| `accounts.ts` | `create` on `accounts` | Auth, workspace, revalidation |
| `budgets.ts` | `create` on `budgets`; cookie for active budget | Auth, revalidation |
| `envelope-balances.ts` | `create` / `update` on `envelope-balances` (upsert pattern) | Auth, workspace, revalidation |
| `workspace.ts` | Cookie for active workspace | No collection writes |

Avoid adding validation in actions that is not also enforced by hooks or access control.

## Testing the contract

Integration tests call **`payload.create` / `payload.update` directly** (no Next.js), e.g. `src/test/transactions.integration.spec.ts`. New domain rules should get similar coverage so REST behavior stays documented and stable.

## Future public API docs

When publishing API documentation:

1. Document virtual `entries` on `transactions` prominently (write input + read output).
2. Document that `transaction-entries` are derived, not primary write targets.
3. Reference hook-enforced errors (balance, transfer category, budget scope).
4. Note multi-tenant `workspace` field requirements and auth (session cookie vs API key / MCP).

## Related

- [`CODE_CONVENTIONS.md`](./CODE_CONVENTIONS.md) — layout, barrels, frontend segment
- [`src/collections/README.md`](../src/collections/README.md) — collection folders
- [`src/access/README.md`](../src/access/README.md) — access maps
- [`.agents/skills/accounting-for-life-app/reference/PROJECT.md`](../.agents/skills/accounting-for-life-app/reference/PROJECT.md) — config and paths
