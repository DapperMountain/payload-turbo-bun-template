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
  "memo": null,
  "entries": [
    { "account": "<checking-uuid>", "amount": -100 },
    { "account": "<savings-uuid>", "amount": 100 }
  ]
}
```

- `entries` on create sets **`status: posted`** (hook) and creates balanced legs.
- Omit `entries` to create a **pending** header only.
- Amounts are **signed** (negative = credit to the account, positive = debit) per account classification rules in the UI.

#### Example: categorize a posted transaction

```http
PATCH /api/transactions/<id>
Content-Type: application/json

{
  "entries": [
    { "account": "<checking-uuid>", "amount": -25, "category": "<category-uuid>" },
    { "account": "<income-uuid>", "amount": 25 }
  ]
}
```

Hooks replace all legs when `entries` is supplied on update.

### Hook pipeline (`collections/Transactions/hooks/`)

| Hook | Role |
|------|------|
| `prepareTransactionPosting` (`beforeChange`) | Normalize `date`; validate `entries`; strip virtual field from persisted doc; stash lines on `context` |
| `shapeTransactionEntriesOnRead` (`afterRead`) | Populate virtual `entries` from `entryJoin`; remove `entryJoin` from response |
| `syncTransactionEntries` (`afterChange`) | Create or replace `transaction-entries` from stashed lines |
| `removeTransactionEntriesOnDelete` (`beforeDelete`) | Cascade-delete legs |

Validation includes:

- Double-entry balance: same-unit journals require `Σ amount ≈ 0`; mixed-unit journals require `Σ reportingAmount ≈ 0` (via `fxRate` on each cross-reporting leg)
- Transfers cannot include categories
- Accounts belong to transaction workspace and budget
- Categories on lines belong to transaction workspace and budget

#### Example: mixed-currency transfer (balanced in reporting USD)

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

`-10 EUR × 1.1 + 11 USD = 0` reporting. Unequal native amounts with balanced reporting is required when units differ.

#### Example: crypto sell with fee (three legs)

```http
POST /api/transactions
Content-Type: application/json

{
  "workspace": "<workspace-uuid>",
  "budget": "<budget-uuid>",
  "date": "2026-07-12T20:00:00.000Z",
  "type": "transaction",
  "memo": "Sell BTC with fee",
  "entries": [
    { "account": "<btc-wallet>", "amount": -0.01, "fxRate": 50000 },
    { "account": "<usd-checking>", "amount": 495 },
    { "account": "<fee-expense>", "amount": 5 }
  ]
}
```

`-0.01 × 50000 + 495 + 5 = 0` reporting. Fee legs are ordinary expense (or asset) lines — no separate fee type.

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

The register UI builds `entries` in the browser (splits, payee → transfer destination, amount sign) — that is **presentation**. The **rules** run in hooks regardless of client.

## Budget field on writes (US-1.3)

Budget-owned collections (`accounts`, `transactions`, `categories`, `category-groups`, `envelope-balances`) require a body **`budget`**. Access checks membership on that id for create/update. The `payload-budget` cookie only selects which budget the Next UI opens — it is not applied to Local/REST writes.

## Currencies & FX (Epic 2)

- **`units.kind`:** `fiat` | `crypto` | `custom`. Codes are unique per workspace (normalized to uppercase).
- **`workspaces.reportingCurrency`:** relationship to a unit in that workspace (seed sets USD).
- **Posting:** `writeTransactionEntries` snapshots `fxRate` / `reportingAmount`. Same unit → rate `1`. Different unit → require `fxRate` on the virtual entry (`reportingAmount = amount * fxRate`).
- **Balance:** Same-unit → `Σ amount ≈ 0`. Mixed-unit → `Σ reportingAmount ≈ 0` (see mixed-currency examples above).

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
| `transactions.ts` | `create` / `update` / `delete` on `transactions` | Auth, workspace, revalidation |
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
