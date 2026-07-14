# Epics & user stories

Story points use Fibonacci (1, 2, 3, 5, 8). Sprint capacity: **16–20 points** per 2-week sprint (single developer).

---

## Epic 0 — Platform & tooling

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-0.1 | Rename monorepo, app package, CI, and agent docs to `accounting-for-life` | 2 | 1 |
| US-0.2 | Bump Payload 3.86, Next, and workspace dependencies | 2 | 1 |
| US-0.3 | Spike: Tailwind v4 web setup + Uniwind/RNR evaluation doc (Payload 4 alignment path) | 3 | 1 |

---

## Epic 1 — Workspaces & budgets

One **workspace = household**. Multiple **budgets** per workspace with shared access (YNAB-style).

| ID | Story | Pts | Sprint | Status |
|----|-------|-----|--------|--------|
| US-1.1 | Model budgets + category groups + categories per budget; seed default catalog | 5 | 1 | **Done** |
| US-1.2 | Budget membership with base roles (admin, member, readonly) | 5 | 1 | **Done** — `user.budgets[]` + `BUDGET_*` roles; trash for budget admin, permanent delete system-admin only |
| US-1.3 | Active-budget context in API hooks and access control | 3 | 1 | **Done** — body `budget` membership on create/update; cookie UI-only |

---

## Epic 2 — Currencies & FX

| ID | Story | Pts | Sprint | Status |
|----|-------|-----|--------|--------|
| US-2.1 | Currency registry: fiat, crypto, and custom user-defined currencies | 5 | 2 | **Partial** — `units` collection (workspace-scoped); crypto/custom kinds TBD |
| US-2.2 | Per-account default currency; workspace reporting currency setting | 3 | 2 |
| US-2.3 | Store FX rates on journal lines at posting time | 5 | 2 |

---

## Epic 3 — Accounts

| ID | Story | Pts | Sprint | Status |
|----|-------|-----|--------|--------|
| US-3.1 | Account types (asset, liability, credit card, equity, income, expense) and chart structure | 3 | 2 | **Done** |
| US-3.4 | Auto-create Credit Card Payment category + group when credit card account added | 3 | 3 | **Done** |
| US-3.2 | Account CRUD with workspace + budget scope and access rules | 5 | 3 | **Partial** — access + CRUD; visibility rules TBD |
| US-3.3 | Derive running balance from posted journal entries | 5 | 3 | **Done** — posted Σ on accounts list + account register running balance |

---

## Epic 4 — Double-entry ledger

Foundation for all money movement.

| ID | Story | Pts | Sprint | Status |
|----|-------|-----|--------|--------|
| US-4.1 | Journal entry schema: balanced debit/credit lines | 5 | 3 | **Done** |
| US-4.2 | Posting engine with validation (must balance, min 2 lines) | 8 | 4 | **Done** — `transactions` hooks + virtual `entries` |
| US-4.3 | Transfer leg sync: single amount edit on one leg updates the other (same header); YNAB “category not needed” for asset↔asset | 5 | 4 | **Done** — register/`updatePrimaryAmountInLines` + detail total sync; integration coverage |
| US-4.4 | Credit card spending moves funds to payment category; payment transfers skip category | 5 | 4 | **Done** — fund payment envelope on CC spend; transfers still skip category |

---

## Epic 5 — Transaction & swap engine

Multi-leg transactions for swaps, barter, fees — not crypto-specific.

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-5.1 | Multi-leg transaction model (N legs, mixed currencies, fees) | 8 | 5 |
| US-5.2 | Split transactions (percentage or fixed amounts per leg) | 5 | 5 |
| US-5.3 | Admin UI: create/edit manual transactions and transfers | 3 | 5 |

---

## Epic 6 — Transaction matching

YNAB-style link manual entries to imported transactions.

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-6.1 | Match manual ↔ imported transactions; merge on confirm | 8 | 6 |
| US-6.2 | Schema hooks for future sync (external ID, import batch) | 5 | 6 |

---

## Epic 7 — Categories, tags & attachments

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-7.1 | Category groups + ordered categories per budget; reorder UI | 5 | 7 |
| US-7.2 | Free-form tags (many-to-many on transactions) | 3 | 7 |
| US-7.3 | File attachments on transactions (Payload upload) | 5 | 7 |
| US-7.4 | Assign category and tags to journal lines | 3 | 7 |

---

## Epic 8 — Rules engine

Monarch-style automation without sync coupling.

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-8.1 | Rule schema: conditions (account, payee, amount, …) + actions | 5 | 8 |
| US-8.2 | Execute rules on transaction create/import | 5 | 8 |
| US-8.3 | Rule actions: category, tags, review assignee, business, split, auto-approve | 5 | 8 |

---

## Epic 9 — Budgeting module

Zero-based envelope budgeting as optional layer on ledger.

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-9.1 | Budget period and envelope balances (category + group) | 5 | 9 |
| US-9.2 | Assign income to envelopes (“ready to assign”) | 5 | 9 |
| US-9.3 | Envelope available balance from categorized spending | 5 | 9 |
| US-9.4 | Rollover and overspend policy per envelope | 5 | 10 |

---

## Epic 10 — Permissions & review workflow

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-10.1 | Granular ACL: account-scoped read/write, hide accounts by role | 8 | 10 |
| US-10.2 | Review assignment, approval states, and audit trail | 5 | 11 |
| US-10.3 | Review inbox: list/filter assigned transactions | 5 | 11 |

---

## Epic 11 — Business entities & tax mapping

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-11.1 | Business entity model; assign to accounts and transactions | 5 | 11 |
| US-11.2 | Filter budget, reports, and registers by business entity | 3 | 12 |
| US-11.3 | Category → tax line mapping with Schedule C default template | 5 | 12 |

---

## Epic 12 — Scheduled & recurring transactions

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-12.1 | Scheduled transaction schema (recurrence, account, payee) | 5 | 12 |
| US-12.2 | Job to create upcoming manual transactions on schedule | 3 | 12 |
| US-12.3 | Link scheduled entries to imported transactions on sync | 5 | 13 |

---

## Epic 13 — Goals

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-13.1 | Savings goal linked to envelope or account | 5 | 13 |
| US-13.2 | Goal progress and target date from ledger activity | 5 | 13 |

---

## Epic 14 — Holdings & pricing

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-14.1 | Holdings accounts (quantity × currency, e.g. BTC, gold oz) | 5 | 14 |
| US-14.2 | Pricing module with provider adapters (CoinGecko + manual) | 5 | 14 |
| US-14.3 | On-demand fetch and configurable scheduled refresh | 3 | 14 |
| US-14.4 | Commodity provider adapter (spot price per oz, unit setting) | 3 | 15 |

---

## Epic 15 — Institution sync (SimpleFIN plugin)

Optional plugin; core has zero sync conditionals.

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-15.1 | Plugin scaffold: register hooks only when `INSTITUTION_SYNC_ENABLED` | 5 | 15 |
| US-15.2 | SimpleFIN account linking and transaction import | 8 | 15 |
| US-15.3 | Reconcile imports via matching engine; idempotent sync | 5 | 16 |

---

## Epic 16 — Consumer web UI

Custom frontend (not Payload admin) for daily use.

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-16.1 | Tailwind v4 app shell, auth, budget switcher | 5 | 16 |
| US-16.2 | Transaction list and detail (register view) | 5 | 17 |
| US-16.3 | Budget view: envelopes, assign, available | 8 | 17 |
| US-16.4 | Account list and transfer flow | 5 | 18 |

---

## Epic 17 — Native mobile (Expo)

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-17.1 | Expo app with Uniwind; shared API client | 5 | 18 |
| US-17.2 | Core screens: transactions, budget, review inbox | 8 | 19 |

---

## Epic 18 — Reporting & export

| ID | Story | Pts | Sprint |
|----|-------|-----|--------|
| US-18.1 | Cash flow and net worth reports | 5 | 19 |
| US-18.2 | Filter by tags, business entity, date range | 5 | 20 |
| US-18.3 | CSV export (documented YNAB-compatible column layout) | 5 | 20 |

---

## Sprint summary

| Sprint | Stories | Points |
|--------|---------|--------|
| 1 | US-0.1–0.3, US-1.1–1.3 | 20 |
| 2 | US-2.1–2.3, US-3.1 | 16 |
| 3 | US-3.2–3.3, US-4.1 | 15 |
| 4 | US-4.2–4.4 | 18 |
| 5 | US-5.1–5.3 | 16 |
| 6 | US-6.1–6.2 | 13 |
| 7 | US-7.1–7.4 | 16 |
| 8 | US-8.1–8.3 | 15 |
| 9 | US-9.1–9.3 | 15 |
| 10 | US-9.4, US-10.1 | 13 |
| 11 | US-10.2–10.3, US-11.1 | 15 |
| 12 | US-11.2–11.3, US-12.1–12.2 | 16 |
| 13 | US-12.3, US-13.1–13.2 | 15 |
| 14 | US-14.1–14.3 | 13 |
| 15 | US-14.4, US-15.1–15.2 | 16 |
| 16 | US-15.3, US-16.1 | 10 |
| 17 | US-16.2–16.3 | 13 |
| 18 | US-16.4, US-17.1 | 10 |
| 19 | US-17.2, US-18.1 | 13 |
| 20 | US-18.2–18.3 | 10 |

### Milestones

| Milestone | After sprint | Criteria |
|-----------|--------------|----------|
| **Ledger MVP** | 6 | Manual txns, transfers, splits, swaps, matching |
| **Daily driver (backend)** | 11 | Budgeting, rules, review, business entities |
| **Sync + assets** | 16 | SimpleFIN, holdings, live pricing |
| **Daily driver (UI)** | 18 | Web app for budget + transactions |
| **v1.0** | 20 | Native app, reports, CSV export |

---

## Future epics (post-v1)

Not sized yet — add when MVP is stable.

- Additional institution sync providers (plugin per provider)
- Payload 4 migration when stable
- In-app AI chat (defer; MCP covers today)
- QIF/OFX import/export
- Multi-jurisdiction tax forms beyond Schedule C template
