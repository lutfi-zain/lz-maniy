# Proposal

## Why

Currently, the Ledger Horizon Board (`/ledger`) forces users to scroll through up to 50 transactions (~3000px) inside an `overflow-y-auto` container to reach a manual "Muat Lebih Banyak" button, creating the false perception that pagination is missing. Worse, `HorizonPeriodColumn.svelte` overwrites the card's cashflow summary with a client-side sum of only the visible transaction slice, displaying truncated, inaccurate figures whenever a period contains more than 50 transactions and causing numbers to jump upon loading more.

Furthermore, `AddPeriodCard.svelte` artificially limits users to selecting whole calendar months (`YYYY-MM`), despite the underlying Reedrich v1.17.0 API natively supporting arbitrary 2D date intervals (`[[startDate, endDate], ...]`) for flexible budgeting cycles (e.g., payroll cycles from the 25th to the 24th, bi-weekly sprints, or arbitrary multi-week planning windows).

## What Changes

- **Automatic Infinite Scroll**: Replace the buried manual "Muat Lebih Banyak" button in `HorizonPeriodColumn.svelte` with a smooth `IntersectionObserver` sentinel that loads the next 50 transactions automatically as the user scrolls near the bottom of the column.
- **Decoupled Server Cashflow Presentation**: Stop overriding `PeriodSummaryCard` cashflow with the incomplete `localCashflow` slice. Rely on `srvPeriod.cashflow` from the server as the immutable source of truth so that Inflow, Outflow, and Net Cashflow are 100% accurate from the initial render and never jump during scrolling.
- **Custom Date Interval Creation**: Enhance `AddPeriodCard.svelte` with a "Custom Date Range" picker alongside the month/year stepper, allowing users to define any start and end date (e.g., `2026-09-25` to `2026-10-24`).
- **Flexible Period Key & Query Serialization**: Upgrade `getMonthDateBounds()`, `mLabel()`, and `settingsStore.settings.activePeriods` to seamlessly parse both canonical months (`YYYY-MM`) and date ranges (`YYYY-MM-DD_YYYY-MM-DD`), passing standard JSON 2D arrays to `reedrichStore.fetchHorizonProjections()`.
- **E2E Validation**: Add Playwright test coverage verifying auto-fetching on scroll and rendering of custom date range horizon columns.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `ledger-studio`: Mandate auto-scroll lazy loading in horizon columns, immutable server cashflow anchoring in `PeriodSummaryCard`, and support for custom date interval period columns.
- `financial-store`: Update `fetchHorizonProjections()` contract to accept 2D interval arrays `[[start, end], ...]` in addition to `YYYY-MM` string arrays.

## Non-Goals
- Changing the List view pagination model (List view retains explicit footer stepper and rows dropdown).
- Introducing backend database schema changes (the Reedrich API already natively supports interval projections).
