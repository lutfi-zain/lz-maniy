# Proposal: Redesign Cockpit & Dedicated Studios Architecture

## Why

The current single-page dashboard presents data in an "infographic / toy" style with low information density, literary serif styling, floating ambient blobs, and transactions locked away inside slide-over drawers. For a user managing complex personal finances across 6 institutions, 17 accounts, and hundreds of transactions, compressing all entities into a single vertical page causes cognitive overload and prevents deep inspection. 

This change transitions the application into a high-trust, high-density **Executive Financial Cockpit & Dedicated Studios** (Hub & Spoke architecture) across 4 dedicated, instant client-side routes (`/`, `/ledger`, `/accounts`, `/planning`). It removes frivolous decorative tropes, introduces tabular typography (`tabular-nums`), adds automatic bank subtotals, and exposes a super dynamic full-width ledger with date-range filtering.

## What Changes

- **Route Architecture (SvelteKit SPA)**:
  - `/` (Executive Cockpit): High-density daily command center with executive KPI strip, live runway alert bar, and an operational 3-column workbench (quick bank balances, live recent transaction feed, monthly expense allocation).
  - `/ledger` (Ledger Studio): Full-width tabular workbench providing super dynamic multi-faceted filtering (date range presets + custom picker, multi-select wallets grouped by bank, multi-select categories, transaction types, realized/planned status, amount range slider, search shortcut `/`), pagination, and live filtered sums.
  - `/accounts` (Bank & Account Matrix): Structured institution tree grouping wallets by bank (BCA, Bank Jago, OCBC, GoPay, Bitget, General) with automatic per-bank subtotals, spendable vs locked partition badges, and direct navigation to that wallet's filtered ledger.
  - `/planning` (Financial Planning Studio): Dedicated planning studio containing 3 distinct workspaces: Active Spending Limits (Budgets), Derived Goals & Multi-wallet Pacing (Sewa Rumah 2026), and Active Obligations (Debts, Loans, & Recurring Templates).
- **Design & Typography System Upgrade**:
  - Remove literary serif (`Newsreader`) from all operational dashboard and data surfaces; standardize on high-precision `Geist Sans` paired with `JetBrains Mono` using `font-variant-numeric: tabular-nums`.
  - Remove decorative ambient drifting background blobs to reinforce utilitarian stability and trust.
  - Clean up the "candy sticker / album pill" effect: replace heavy colored badges with quiet semantic dot indicators and crisp border separators.
- **State Layer Enhancements (`reedrich.svelte.ts`)**:
  - Enhance reactive state to support multi-parameter ledger filtering, date range slicing, bank aggregation helpers, and cross-route active filter handoffs.

## Capabilities

### New Capabilities

- `ledger-studio`: Full-width tabular workbench at `/ledger` with super dynamic filtering (date range with presets/custom, multi-select wallets grouped by bank, multi-select categories, type, status, amount range, search), pagination, sorting, and aggregate sum indicators.
- `account-matrix`: Institutional account hierarchy at `/accounts` computing automatic subtotals per bank/institution, partitioned into operational spendable vs locked reserves, with direct 1-click drilldown into that account's filtered ledger.
- `planning-studio`: Planning workspace at `/planning` featuring tabs for monthly spending limits (budgets), multi-wallet derived goals with pacing timelines (Sewa Rumah 2026), and active obligations (debts/receivables) with 13 recurring transaction schedules.

### Modified Capabilities

- `account-dashboard`: Redesign `/` into an executive cockpit. Remove serif display typography and decorative ambient blobs; introduce high-density 3-column operational layout (bank balances, live recent transactions feed, allocation pacing).

## Impact

- **Routing & Navigation**: Adds `/ledger`, `/accounts`, and `/planning` routes alongside `/` in `src/routes/`.
- **User Experience**: Drastically increases scan speed and data density while giving every major financial entity its own dedicated screen.
- **Dependencies**: No new external dependencies required; leverages existing SvelteKit, `phosphor-svelte`, and `bits-ui`.
