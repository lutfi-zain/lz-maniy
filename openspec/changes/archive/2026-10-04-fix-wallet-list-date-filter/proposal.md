## Why

In the Account & Banking dashboard (`/accounts`), selecting date presets (such as *Last Month* or *Next Month*) or custom date intervals does not alter the displayed wallet balances, bank group subtotals, or top portfolio KPI cards. Although the Reedrich edge API (`GET /api/v1/wallets?startDate=...&endDate=...`) already computes point-in-time historical balances and forward-looking projections (inclusive of planned transactions) in the `snapshot.totalBalance` payload field, the frontend `fetchWallets()` method unconditionally maps `w.walletBalance` (the live balance today). This causes the wallet list view to remain flat across all time horizons, contradicting the date picker controls and the adjacent reactive Horizon Board.

## What Changes

- **Point-in-Time Wallet Balance Extraction**: Update `RawWalletEntry` in `reedrich.svelte.ts` to define the `snapshot` payload (`totalBalance`, `initialBalance`, `periodDelta`, `totalIn`, `totalOut`, `startDate`, `endDate`). Map `balance` using `w.snapshot?.totalBalance ?? w.walletBalance ?? w.balance ?? 0`.
- **Reactive Macro & Subtotal Updates**: Ensure `timelineNetWorth`, institution subtotals (`groupedInstitutions`), and wallet card items in `/accounts` immediately reflect the server-projected or historical balances returned by `fetchWallets`.
- **Query Filter Invariant**: Ensure `fetchWallets()` defaults to or preserves status filter `all` so that future periods include planned transactions and historical periods include realized transactions.
- **Unit & Contract Verification**: Add comprehensive tests in `reedrich.test.ts` asserting that `fetchWallets()` extracts `snapshot.totalBalance` when temporal parameters are provided and falls back to `walletBalance` when `snapshot` is absent.

## Capabilities

### New Capabilities
<!-- None: uses existing capabilities -->

### Modified Capabilities
- `financial-store`: Map and expose server-computed point-in-time wallet snapshot balances (`snapshot.totalBalance`) in `fetchWallets()`.
- `account-dashboard`: Ensure the wallet list view, institution grouping subtotals, and macro summary KPI cards reactively reflect point-in-time balances when the date filter changes.

## Impact

- `apps/web/src/lib/stores/reedrich.svelte.ts`: `fetchWallets()` mapping logic and `RawWalletEntry` interface.
- `apps/web/src/lib/stores/reedrich.test.ts`: Unit test cases verifying snapshot balance priority.
- `apps/web/src/routes/accounts/+page.svelte`: Reactive alignment with temporal wallet balances.
- No breaking changes: Non-temporal requests continue returning current `walletBalance` seamlessly.
