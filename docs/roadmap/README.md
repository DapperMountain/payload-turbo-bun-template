# Roadmap — accounting-for-life

Product vision, architecture decisions, and sprint plan for a self-hosted personal finance app combining the best of YNAB and Monarch on Payload CMS.

## Product summary

| Area | Direction |
|------|-----------|
| **Tenancy** | Payload `plugin-multi-tenant`: one **tenant = household/workspace**. Multiple **budgets** per tenant (YNAB-style); share budgets with granular roles. |
| **Ledger** | Double-entry journal as source of truth. All transactions, transfers, splits, and swaps are balanced entries. |
| **Swaps** | First-class **multi-leg transactions** (crypto swaps, barter, fees) — not a separate “crypto” feature. |
| **Budgeting** | Separate **budget module** on top of the ledger (zero-based envelopes). Optional per business entity filter. |
| **Business** | **Business entities** (Monarch-style) + free-form **tags** (not either/or). Attachments on transactions for tax audit. |
| **Sync** | Institution sync as **optional Payload plugin** (SimpleFIN first). No sync conditionals in core. |
| **Pricing** | Shared **pricing module** with provider adapters (not one plugin per API). On-demand + optional scheduled refresh. |
| **Tax** | Flexible **category → tax line** mapping with Schedule C as a US default template — not hardcoded to one form. |
| **UI** | Payload admin for config/data; **consumer app** (web + native) for daily use. Migrate design system toward **Tailwind v4 + Uniwind / React Native Reusables** for Payload 4 alignment. Stay on **Payload 3.86** until v4 stable (Node 24.15+). |
| **AI** | Deferred in-app; use existing **MCP plugin** for data insights. |

## Sprint conventions

| Rule | Value |
|------|-------|
| Sprint length | 2 weeks |
| Capacity | 16–20 story points per person per sprint |
| Story point scale | Fibonacci: 1, 2, 3, 5, 8 |
| Max per story | 8 points (must fit in one sprint) |
| Estimates | Relative complexity, not hours |

Stories are intentionally coarse — each delivers a testable slice. Split further only when implementation starts.

## Phase overview

| Phase | Sprints (est.) | Focus |
|-------|----------------|-------|
| **0 — Platform** | 1 | Rename, deps, design-system direction |
| **1 — Core ledger** | 4–5 | Workspace, accounts, currencies, journal, swaps, matching |
| **2 — Classification** | 2–3 | Categories, tags, attachments, rules |
| **3 — Budgeting** | 2 | Zero-based budget module |
| **4 — Collaboration** | 2 | Permissions, review workflow |
| **5 — Business & tax** | 2 | Business entities, tax line mapping |
| **6 — Automation** | 2 | Recurring/scheduled transactions, goals |
| **7 — Assets & pricing** | 2 | Holdings, valuation, price feeds |
| **8 — Sync** | 2 | SimpleFIN plugin |
| **9 — Consumer UI** | 4–6 | Web app, then native |
| **10 — Reporting** | 1–2 | Reports, CSV export |

**MVP milestone (daily driver):** end of Phase 4 + manual transactions + basic web UI (partial Phase 9). Institution sync and full native can follow.

## Architecture modules

```text
apps/accounting-for-life/
  src/
    modules/
      ledger/           # journal, entries, posting engine
      accounts/         # account types, balances
      currencies/       # fiat, crypto, custom; FX snapshots
      transactions/     # user-facing txn + swap engine
      matching/         # manual ↔ imported link (YNAB-style)
      categories/       # category tree
      tags/
      attachments/
      budgets/          # envelope budgeting (optional module)
      review/           # assignment + approval workflow
      business/         # business entities
      tax-mapping/      # category → tax line templates
      goals/
      pricing/          # price providers + refresh jobs
      holdings/         # asset quantity × price
    plugins/
      institution-sync-simplefin/   # optional; registers hooks only when enabled
```

Payload collections and plugins wrap these modules. Core modules have **no imports** from sync or pricing plugins.

## Related docs

- [Epics & user stories](./EPICS.md) — full backlog with points and sprint allocation
- [Product decisions](./DECISIONS.md) — resolved questions from planning
