# Product & technical decisions

Decisions captured during initial planning (July 2026).

## Tenancy & budgets

- **Tenant = household/workspace** (Payload multi-tenant plugin).
- **Multiple budgets per tenant** — e.g. personal budget, daughter’s budget, or filtered views by business entity within one budget.
- Open-source friendly: same model supports self-hosted single household or future multi-household hosting.

## Permissions & review

- Generic **roles with granular ACL** — read-only budget access, account-scoped edit restrictions, hide sensitive accounts from certain members.
- **Review workflow** — assign transactions to users; rules can auto-assign. Approval states TBD during Epic 10 implementation.
- Hiding transactions from some members may use **account-level visibility** rather than deleting ledger rows.

## Ledger & budgeting

- **Double-entry ledger** is the foundation; budgeting is a **separate module** that reads ledger state (supports both YNAB-style envelopes and Monarch-style cash-flow views later).
- **Default currency per account**; UI can show converted amounts without persisting (live FX fetch).
- **FX at execution time** stored on journal lines for reporting currency comparisons.

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
- **Align patterns now:** Tailwind CSS v4 on web (Payload’s scoped admin guide), evaluate **Uniwind** + **React Native Reusables** for native — shared token/theme, not Tamagui long-term.
- Payload admin remains Payload UI; consumer app is custom frontend.

## AI & export

- **No in-app chat** for MVP; MCP plugin for external AI access.
- **CSV export** — YNAB-compatible columns where practical; document format in Epic 19.

## Non-goals (MVP)

Payroll, invoicing, AR/AP billing, bank bill pay, full GAAP statements, SaaS billing.
