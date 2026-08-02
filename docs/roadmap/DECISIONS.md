# Product & technical decisions

Decisions captured during initial planning (July 2026).

## Greenfield — no legacy compatibility

This product is built **from the ground up**. There is no production user base or external schema contract to preserve.

- Do **not** keep deprecated fields, dual-write caches, “legacy OR” query paths, or compatibility shims “just in case.”
- When a model is wrong, **change it**: drop columns, rewrite seed/migrations for the new shape, update call sites in the same change.
- Prefer deleting old code and docs over leaving `// legacy` branches. Idempotent migrations may still guard “column already gone” for local DBs that were push-migrated — that is not a product compatibility layer.

## Tenancy & budgets

- **Workspace = household** (Payload multi-tenant plugin; collection slug `workspaces`).
- **Multiple budgets per workspace** — e.g. personal budget, daughter’s budget, or filtered views by business entity within one budget.
- Open-source friendly: same model supports self-hosted single household or future multi-household hosting.

## Permissions & review

- Generic **roles with granular ACL** — read-only budget access, account-scoped edit restrictions, hide sensitive accounts from certain members.
- **Budget membership (US-1.2):** `user.budgets[]` with `BUDGET_ADMIN` | `BUDGET_MEMBER` | `BUDGET_READONLY`. Creating a budget grants admin to the creator and seeds membership for workspace peers. Budget-scoped collections filter by membership; writers exclude readonly.
- **Budget delete:** Budgets use Payload `trash: true`. Soft-delete (trash) is allowed for `BUDGET_ADMIN`; permanent purge (Empty trash) is system-admin only. Membership rows stay on soft-delete so restore keeps access; `beforeDelete` clears live `user.budgets[]` before permanent delete.
- **Active budget (US-1.3):** Body `budget` is API authority for create/update on budget-owned collections (membership checked as boolean — Payload create `Where` is not enforced). `payload-budget` cookie is frontend UI default only; never stamped onto write payloads.
- **Review workflow** — assign transactions to users; rules can auto-assign. Approval states TBD during Epic 10 implementation.
- Hiding transactions from some members uses **account-level visibility** rather than deleting ledger rows.
- **Account visibility (US-3.2):** `accounts.visibility` defaults to `all_members`. `admins` hides the account from `BUDGET_MEMBER` / `BUDGET_READONLY` (budget admins and system admins still see it). Transaction and `transaction-entries` reads filter so members do not list docs that only touch admin-only accounts. Per-user allowlists and account-scoped **write** ACL remain **US-10.1**.

## Ledger & budgeting

- **Double-entry ledger** is the foundation; budgeting is a **separate module** that reads ledger state (supports both YNAB-style envelopes and Monarch-style cash-flow views later).
- **Classical posting:** Categorized spends/income post as **cash/liability leg + system Income/Expense chart account leg**. Categories remain **envelope tags** on the P&L leg (not 1:1 chart accounts). Payees are **entry-line metadata only** (`transaction-entries.payee`), never balancing accounts and never a transaction header field. **Same-account payment + category-offset twins are rejected** — they cancel in `sumPostedAccountBalance` and are not how YNAB stores data. YNAB influences UX (transfers skip category, envelopes), not twin Checking legs.
- Per budget, seed thin system accounts **Budget expenses** / **Budget income** (`classification` expense/income, `isSystemDefault`) — hidden from normal payment/transfer pickers.
- **Default currency per account** (`accounts.unit`); workspace **`reportingCurrency`** for portfolio / budget numeraire.
- **Transaction quote unit** (`transactions.quoteUnit`, optional): valuation frame for rates and balance; defaults to workspace reporting currency when omitted.
- **FX at execution time:** entry `fxRate` = **quote units per 1 account unit**; when quote ≠ reporting, optional header `quoteToReportingRate` = reporting per 1 quote; `reportingAmount = amount × rateToQuote × quoteToReportingRate` when known, else null (deferred valuation). Identity rate `1` when account unit matches quote. Cross-quote posts must pass `fxRate` on the virtual `entries` leg.
- **Balance (US-5.1):** Same-unit journals require `Σ amount ≈ 0`. Mixed-unit journals require Σ amounts in **quote** space ≈ 0 (natives need not cancel). Portfolio snapshot uses `reportingAmount` when present. Fees are extra legs in the same `entries` array.
- UI may still show live converted amounts without changing the stored snapshot.

### Implemented schema (July 2026)

| Collection | Purpose | Versioning |
|------------|---------|------------|
| `units` | Workspace currency registry (`code`, `kind`: fiat/crypto/custom, `decimalPlaces`) | No |
| `accounts` | Chart accounts: `classification`, `subtype`, `unit`, `budget`, `visibility`, optional `isSystemDefault` (thin P&L), optional `category` (credit cards only) | Yes (50) |
| `transactions` | Header: `date`, `type`, `status`, `budget`, `source`, `externalId`, `importBatch`, optional `quoteUnit` / `quoteToReportingRate` (**no `payee`** — see below) | Yes (50) |
| `transaction-entries` | Legs: `account`, signed `amount`, `unit`, optional `category`, `payee` (merchant), `notes`, `fxRate` (to quote), `reportingAmount` | No |
| `workspaces` | Household + optional `reportingCurrency` → `units` | No |

- **Balances:** Computed from posted `transaction-entries` (Σ signed amounts). Accounts list and account-register running balance use the same helper — not stored on the account document.
- **Line-only payee (Aug 2026):** `transactions.payee` is **dropped** (migration `20260802_drop_transaction_payee`); merchants live on `transaction-entries.payee` and transfers are expressed by the two accounts. No derived header cache: register labels, dialog titles, filters, and payee autocomplete all read entry payees. Admin `useAsTitle` is `date`.
- **Entry types:** `transaction`, `transfer`, `adjustment`, `opening_balance`. **Status:** `pending`, `posted` (consumer). Consumer UI does **not** pick type — `transfer` vs `transaction` is derived from the legs (wallet↔wallet accounts vs any merchant/category/P&L leg). `adjustment` / `opening_balance` remain schema values for seed/account-setup, not create-dialog choices.
- **Economic kind (display):** Derived from legs for register/detail badges (`spend` / `earn` / `transfer` / `withdraw`/`deposit` with account viewpoint). Cash↔holding is ambiguous (`buy`/`sell`/`transfer`) — optional `transactions.economicKind` stores the user’s confirmation.
- **Transfers / swaps:** `type: transfer` (account↔account) or `transaction` (any leg carries a merchant/DEX payee or category), one **transaction header** with balanced legs (Model A). Two-leg wallet transfers (any units) use the **payment** body (YNAB single line: account payee, category disabled) — not the 2-line exchange editor. Fee / N-leg books use **journal** (or “Edit as journal”). Asset ↔ asset pair legs: no categories (MVP). Give/receive sides pick a **wallet account** plus an optional **merchant-only** payee (no transfer options, no self-transfer); swaps may add fee/other lines with their own payees. Register shows **one row per header**; account registers still show the viewpoint leg. A second header per account (Model B) is out of scope until import/register UX requires it.
- **Credit cards:** `subtype: credit_card` auto-creates a `credit_card_payments` group + `credit_card_payment` category on account create.

## Categories & category groups

- **Category groups → categories** (Monarch-style UI), scoped to a **budget** (not a flat tree).
- Each budget seeds a **default category catalog** on create (Income group + expense groups: Fixed, Food & Dining, Subscriptions, Lifestyle, Shopping, Health & Wellness, Financial, Other, Savings). Catalog lives in `src/database/seed/categories/index.ts`.
- Seeded categories are **`isSystemDefault: true`** — user-editable later; “Custom” labels in Monarch reference screenshots are still part of the default seed.
- **Credit Card Payments** is a reserved group kind (`credit_card_payments`), auto-created when a credit card **account** is added (Epic 3) — not part of the manual seed catalog.
- Category **purpose** distinguishes income, everyday spending, and per-card payment envelopes (`credit_card_payment`).

## Transfers & credit cards (YNAB semantics)

Reference: [Handling Credit Cards in YNAB](https://support.ynab.com/en_us/handling-credit-cards-overview-ry7cNub1s).

| Transaction | Category required? | Budget effect |
|-------------|-------------------|---------------|
| **Asset ↔ asset transfer** (checking → savings) | **No** — “category not needed” | None |
| **Credit card spending** (purchase on card) | **Yes** — expense category | Increases that card’s **Credit Card Payment** `envelope-balances.assigned` by the spend amount (budget coverage moves with the charge); spending category activity still reduces Available |
| **Credit card payment** (checking → card) | **No** — transfer only | Reduces card balance; payment category already holds reserved cash (Ready to Assign ignores payment-envelope assigned) |
| **External payment** (off-budget account) | Credit Card Payment category on inflow | Manual assign to payment category |

- **Linked transfer editing** (Epic 4, US-4.3): single amount edit updates offsetting legs on the **same** transaction; validation skips category when both legs are non–credit-card asset accounts.
- **Credit card accounts** are a distinct account subtype (liability) that triggers auto-creation of a matching payment category under the Credit Card Payments group.

## Swaps & multi-leg transactions

- **Swap engine** in transaction core — crypto XRP→XLM, barter, fees as legs of one journal entry.
- Not limited to cryptocurrency; custom currencies (hours, marbles) are first-class.
- **Posting (US-5.1):** N legs via virtual `entries`; mixed-unit balance from amounts (reporting valuation may be deferred). Consumer UI: one dialog with **payment** / **exchange** / **journal** — no Swap tab. **Swap** is transfer-like (account↔account, each side optionally tagged with a merchant) with a grouped give/receive UI, one shared note, and optional **other lines** for fees/third-party payees (same editor as journal escape). Fees post as cash + system expense (category tag), not same-account twins. **Allocate splits** stay on the payment body with **payee per line** (YNAB-style UX). Give/receive legs have **no category**; fee/other lines may carry category and **per-line `payee`**. Posted `type: transaction` requires a merchant `payee` on every categorized entry; allocate/swap editor lines need merchant or account/transfer. Transfers use destination accounts. Exchange/DEX names live on the give/receive leg that carries them — there is **no header payee** to sync or clear. Register payee column joins entry merchants (`A · B`) and is blank for pure transfers. Persists as `type: transaction` or `transfer`.

## Business & tax

- **Business entity** field (Monarch Plus model) **plus** free-form **tags**.
- **Attachments** on transactions (receipts) for tax audit — required for MVP business use.
- **Tax mapping:** flexible `category → tax line` with **Schedule C as a default US template**, not the only schema. Allows other jurisdictions/forms later without rework.

## Institution sync

- **Plugin architecture** — `@payloadcms/plugin-*` or local plugin package; hooks register only when plugin enabled.
- **SimpleFIN** first (existing subscription).
- Geography not artificially limited at schema level.
- **Import foothold (US-6.2):** `transactions.source` (`manual` \| `import`), optional `externalId` (unique per workspace when set), optional `importBatch`.
- **Match/merge (US-6.1):** Pair one `source: manual` + one `source: import` row; keep manual legs (categorization / entry payees / notes), take import identity + bank date, delete the import row. Exposed as `POST /api/transactions/match`.

## Asset valuation

- **Single pricing module** with internal provider adapters (CoinGecko, metals API, manual).
- One plugin per provider only if integration size warrants it; start with adapters inside `pricing/`.
- **On-demand** price fetch + optional **scheduled refresh** (user-configurable interval).

## Design system & Payload 4

- **Stay on Payload 3.86** for stability; v4 canary requires Node 24.15+ and is still pre-beta.
- **Implemented:** `@dappermountain/ui` (`packages/ui`) — Tailwind v4 + shadcn/ui (web); `apps/mobile` — Expo + Uniwind + RNR-style button spike.
- **Payload admin** remains Payload UI; consumer apps use the shared token package.
- **Payload 4** — migrate when beta ships; admin Tailwind alignment comes with the upgrade.

## AI & export

- **No in-app chat** for MVP; MCP plugin for external AI access.
- **CSV export** — YNAB-compatible columns where practical; document format in Epic 19.

## Non-goals (MVP)

Payroll, invoicing, AR/AP billing, bank bill pay, full GAAP statements, SaaS billing.
