# Product & technical decisions

Decisions captured during initial planning (July 2026).

## Tenancy & budgets

- **Workspace = household** (Payload multi-tenant plugin; collection slug `workspaces`).
- **Multiple budgets per workspace** — e.g. personal budget, daughter’s budget, or filtered views by business entity within one budget.
- Open-source friendly: same model supports self-hosted single household or future multi-household hosting.

## Permissions & review

- Generic **roles with granular ACL** — read-only budget access, account-scoped edit restrictions, hide sensitive accounts from certain members.
- **Review workflow** — assign transactions to users; rules can auto-assign. Approval states TBD during Epic 10 implementation.
- Hiding transactions from some members may use **account-level visibility** rather than deleting ledger rows.

## Ledger & budgeting

- **Double-entry ledger** is the foundation; budgeting is a **separate module** that reads ledger state (supports both YNAB-style envelopes and Monarch-style cash-flow views later).
- **Default currency per account**; UI can show converted amounts without persisting (live FX fetch).
- **FX at execution time** stored on journal lines for reporting currency comparisons.

### Implemented schema (July 2026)

| Collection | Purpose | Versioning |
|------------|---------|------------|
| `units` | Workspace currency/commodity registry (`code`, `kind`, `decimalPlaces`) | No |
| `accounts` | Chart accounts: `classification`, `subtype`, `unit`, `budget`, optional `category` (credit cards only) | Yes (50) |
| `transactions` | Header: `date`, `memo`, `type`, `status`, `budget` | Yes (50) |
| `transaction-entries` | Legs: `account`, signed `amount`, `unit`, optional `category` | No |

- **Posting:** `POST /api/transactions` with virtual `entries` on create/update — collection hooks validate balance and write `transaction-entries`. The same `entries` array is returned on read via `afterRead`. Legs are not writable via the entries collection API.
- **Entry types:** `transaction`, `transfer`, `adjustment`, `opening_balance`. **Status:** `draft`, `posted`, `void`.
- **Transfers:** `type: transfer`, one **transaction header** with balanced legs (Model A). Asset ↔ asset: no categories on lines (MVP). A second header per account (Model B) is out of scope until import/register UX requires it.
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
| **Credit card spending** (purchase on card) | **Yes** — expense category | Moves funded amount from spending category → that card’s **Credit Card Payment** category |
| **Credit card payment** (checking → card) | **No** — transfer only | Reduces card balance; payment category already holds reserved cash |
| **External payment** (off-budget account) | Credit Card Payment category on inflow | Manual assign to payment category |

- **Linked transfer editing** (Epic 4, US-4.3): single amount edit updates offsetting legs on the **same** transaction; validation skips category when both legs are non–credit-card asset accounts.
- **Credit card accounts** are a distinct account subtype (liability) that triggers auto-creation of a matching payment category under the Credit Card Payments group.

## Swaps & multi-leg transactions

- **Swap engine** in transaction core — crypto XRP→XLM, barter, fees as legs of one journal entry.
- Not limited to cryptocurrency; custom currencies (hours, marbles) are first-class.

## Business & tax

- **Business entity** field (Monarch Plus model) **plus** free-form **tags**.
- **Attachments** on transactions (receipts) for tax audit — required for MVP business use.
- **Tax mapping:** flexible `category → tax line` with **Schedule C as a default US template**, not the only schema. Allows other jurisdictions/forms later without rework.

## Institution sync

- **Plugin architecture** — `@payloadcms/plugin-*` or local plugin package; hooks register only when plugin enabled.
- **SimpleFIN** first (existing subscription).
- Geography not artificially limited at schema level.

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
