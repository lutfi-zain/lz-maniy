# account-matrix Specification

## Purpose
Provides an institutional account and wallet management matrix at `/accounts` displaying wallets grouped hierarchically by bank or institution with automated subtotal balances, spendable versus locked partitioning, multi-currency support, and seamless drilldown to filtered ledger views.

## Requirements

### Requirement: Hierarchical Institution Grouping with Subtotals
The account matrix SHALL group all user wallets by financial institution (e.g., Bank Central Asia, Bank Jago, OCBC, GoPay, Bitget, General Cash) and automatically compute and display the aggregate balance subtotal for each institution dynamically recomputed across timeline horizons.

#### Scenario: Display Bank Groups with Subtotals
- **WHEN** user views `/accounts`
- **THEN** each institution header displays the institution name, total number of accounts, and the consolidated balance subtotal (e.g., "BCA · 2 akun · Rp 8.975.931,69").

#### Scenario: Reactive Institution Subtotals Across Timeline Horizons
- **WHEN** user selects a future date horizon (e.g. "Bulan Depan") or past date horizon (e.g. "Bulan Lalu") via the accounts date picker
- **THEN** each institution header recomputes and displays its subtotal reflecting the projected or historical closing balances of all its underlying accounts at that horizon.

### Requirement: Granular Account Status & Currency Breakdown
Each wallet within an institution group SHALL display its account name, purpose, access status (Operasional vs Cadangan with standardized icons and tooltips), currency ticker directly (`IDR`, `USDT`) without redundant "Mata Uang" or "Tipe" labels, exact timestamp for its last transaction, and support date range timeline filtering, sorting, filtering, and grouping controls.
#### Scenario: View Account Allocation Without Redundant Labels
- **WHEN** inspecting accounts under `/accounts`
- **THEN** each row displays the currency ticker directly (e.g. `IDR` or `USDT`) and exact last transaction date/time without displaying redundant "Mata Uang:" or "Tipe:" text.

#### Scenario: Filter and Sort Accounts
- **WHEN** user searches for a wallet name or changes sorting (by balance, name, or last transaction date)
- **THEN** the account list updates reactively to match the criteria.


#### Scenario: Date Range Timeline Filtering for Wallet Balances
- **WHEN** user selects a date range preset (such as "Bulan Depan" or "Bulan Lalu") in `/accounts`
- **THEN** every wallet row renders its point-in-time balance computed from starting balance plus net scheduled or historical flows up to that date, with unencumbered operational vs locked reserve status clearly labeled.
### Requirement: Direct Navigation to Filtered Ledger
Each wallet row SHALL provide a direct action button to view its transaction history.

#### Scenario: Navigate from Wallet to Ledger
- **WHEN** user clicks "Lihat Mutasi" on "BCA Main"
- **THEN** the application navigates to `/ledger?walletId=...`, pre-filtering the transaction ledger to that specific wallet.

### Requirement: Bank and Accounts Multi-Period Horizon Board View
The Bank & Accounts studio (`/accounts`) SHALL support a multi-period Horizon Board view displaying chronological point-in-time balance projections for each wallet and liquidity aggregates.

#### Scenario: Switch Accounts View to Horizon Board
- **WHEN** user clicks the `Horizon Board` view toggle on `/accounts`
- **THEN** the view renders chronological period columns for all active configured horizons
- **AND** each period column lists every wallet with its projected balance at that month-end date (`calculatePointInTimeWalletBalances`).

#### Scenario: View Liquidity Aggregate Breakdown Per Horizon
- **WHEN** viewing any period column in the Accounts Horizon Board
- **THEN** the column footer or summary area displays point-in-time Spendable total, Locked total, and Total Net Worth at that horizon date.

#### Scenario: Switch Accounts View to List
- **WHEN** user selects `List` on `/accounts`
- **THEN** the view renders the standard grouped or flat wallet card matrix.

### Requirement: In-Memory Account Matrix Filter Persistence Across Navigation
Active filter and sorting preferences on `/accounts` SHALL persist in memory across client-side SPA navigation until the browser tab is refreshed.

#### Scenario: Retain Accounts Filters Across Navigation
- **WHEN** user changes status filter (e.g. to "Spendable" or "Locked"), search query, or sort order on `/accounts`
- **AND** navigates to `/ledger` or `/planning` and returns to `/accounts`
- **THEN** the status filter, search query, and sort order remain exactly as selected.

### Requirement: Standalone Wallet List Synchronization
The Bank & Accounts studio (`/accounts`) SHALL fetch wallet data directly from `reedrichStore.fetchWallets()` upon mounting and following any wallet mutation.

#### Scenario: On-Mount Direct Wallet Query
- **WHEN** user navigates to `/accounts`
- **THEN** `reedrichStore.fetchWallets()` is invoked
- **AND** wallet cards render with real-time `lastTransaction` details (date, amount, category, and direction)
- **AND** sorting by `last_tx` orders wallets accurately by their actual last mutation date.

### Requirement: Context-Aware Toolbar in Horizon View
The account matrix toolbar SHALL adapt to the active view mode, hiding redundant temporal pickers in multi-period views.

#### Scenario: Hide Date Range Picker in Horizon Mode
- **WHEN** view mode is set to `Horizon Board` on `/accounts`
- **THEN** the top `DateRangePicker` is hidden
- **AND** when view mode is switched back to `List`, the `DateRangePicker` is visible.

#### Scenario: Filtered Subtotals in Horizon Columns
- **WHEN** a search keyword or status filter is active on `/accounts` in Horizon Board mode
- **THEN** each period column calculates its subtotal metrics from the subset of wallets matching the filter criteria.
