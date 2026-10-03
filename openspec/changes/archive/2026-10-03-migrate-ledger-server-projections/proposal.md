# Proposal

## Why

Commit `fb92c1c` retired `fetchAllTransactions()` (an unbounded `while(true)` loop) in favor of server-driven pagination, but left `reedrichStore.allTransactions` as a zombie `[]` array. Every `/ledger` surface that passes this array to `calculatePointInTimeNetWorth` or `calculatePointInTimeWalletBalances` now computes a zero delta, producing silently incorrect financial projections. The Accounts and Goals Horizon Boards were migrated to `fetchHorizonProjections()` in the same period; the Ledger was missed.

**Impact**: On the live deployment, the `/ledger` List View right-zone anchor shows Rp 14.25M for a Jul 2027 projection that the server computes as Rp 96.62M — a Rp 82M discrepancy. Every Horizon Board column displays identical Net Worth, Spendable, and Committed values regardless of monthly cashflow. No E2E test catches this because assertions check label existence, not numeric integrity.

## What Changes

- **Ledger List View (`routes/ledger/+page.svelte`)**: Replace client-side `calculatePointInTimeNetWorth` with a server-driven projection source for the right-zone Net Worth anchor.
- **Ledger Horizon Board (`components/ledger/HorizonBoard.svelte`)**: Add `fetchHorizonProjections()` call (matching Accounts/Goals pattern), consume `srvPeriod.netWorth` and `srvPeriod.walletBalances` instead of local computation from empty `allTransactions`.
- **Fallback resilience (Accounts/Goals Horizon Boards)**: Surface a visible warning when the fallback path activates with an empty `allTransactions`, preventing silent degradation.
- **Skeleton condition fix**: Replace broken `isLedgerLoading` guard in Ledger Horizon Board with the `isHorizonLoading` pattern used by Accounts/Goals.
- **Zombie state cleanup**: Deprecate `reedrichStore.allTransactions` and `isLedgerLoading` — remove all consumer references and the dead state fields.
- **E2E value integrity tests**: Add Playwright assertions that verify projected Net Worth changes across horizon periods and differs from the present-month value when future cashflow exists.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ledger-studio`: Add requirement for server-driven horizon projections and value-integrity invariant on the Net Worth anchor.
- `financial-store`: Deprecate the `allTransactions` full-history field and `isLedgerLoading` flag.
- `financial-value-testing`: Add scenario asserting ledger horizon Net Worth differs across periods with nonzero cashflow.

## Non-Goals

- Changing the Reedrich backend `/api/v1/analytics/horizon` endpoint behavior.
- Modifying the Cockpit, Planning, or Agent Chat surfaces (verified unaffected).
- Refactoring `calculatePointInTimeNetWorth` / `calculatePointInTimeWalletBalances` utility functions (they remain valid for offline/unit-test use).
