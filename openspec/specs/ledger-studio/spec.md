# ledger-studio Specification

## Purpose
Provides a full-width dedicated transaction ledger studio at `/ledger` featuring super dynamic multi-faceted filtering (date range presets, custom picker, wallet multi-select by bank, category multi-select, transaction types, status, and search), responsive pagination, and real-time aggregate totals.

## Requirements

### Requirement: Full-Width Tabular Transaction Ledger
The ledger studio SHALL render user transactions using a responsive dual-presentation model: a full-width tabular grid on desktop (>= 768px) and a flat dense feed with zero horizontal scrolling on mobile (< 768px), displaying all primary amounts in IDR with secondary native currency notation.

#### Scenario: View Transaction Rows with Category Column
- **WHEN** user navigates to `/ledger` on a desktop viewport
- **THEN** each transaction row explicitly displays the resolved category name alongside its description, source wallet, and amount within a high-density tabular grid.

#### Scenario: Configure Pagination Page Size
- **WHEN** user selects a page size limit (25, 50, or 100)
- **THEN** the ledger renders the requested number of rows per page with a bounded navigation stepper.

#### Scenario: Mobile Viewport Dual-Presentation Dense Transaction Feed
- **WHEN** user navigates to `/ledger` on a mobile viewport (< 768px)
- **THEN** transactions render as a vertical dense document feed without horizontal table scrolling, displaying Description and Amount on the primary line, accompanied by Date, Category tag, and Account routing on the secondary line.

#### Scenario: Primary Amount Display in IDR for Multi-Currency Accounts
- **WHEN** viewing a transaction originating from a non-IDR wallet (such as Bitget in USDT)
- **THEN** the primary displayed nominal amount is formatted in IDR (e.g. `Rp 178.358`) with the native currency amount (e.g. `10 USDT`) displayed as secondary text.

### Requirement: Super Dynamic Multi-Faceted Filter Engine
The ledger studio SHALL provide client-side filtering by 2-Click Date Range (presets: "Bulan Ini" [default], "Bulan Depan", "Bulan Lalu", "Hari Ini", "Semua Waktu", "Rentang Khusus" without native HTML inputs), Searchable Multi-Select Combobox for Wallets (grouped by bank) and Categories, Category ID matching, Type, Status, and Search.

#### Scenario: Filter by Category ID
- **WHEN** user selects or navigates to category "Makan & Minum"
- **THEN** the ledger matches transactions where `t.transactionCategoryId === categoryId`, correctly displaying all associated food and beverage transactions regardless of their individual description text.

#### Scenario: Select Date Range via 2-Click Calendar
- **WHEN** user clicks a start date and an end date on the custom calendar popover
- **THEN** the date range is immediately applied with active visual range highlighting.

#### Scenario: Search and Multi-Select in Combobox
- **WHEN** user types in the wallet or category combobox search input
- **THEN** the list filters instantly without requiring manual scrolling, and user can check multiple items simultaneously.

### Requirement: Dynamic Filtered Financial Aggregates
The ledger studio SHALL render a dual-layer summary strip partitioned into a localized filter metrics zone (left) and an independent global point-in-time Net Worth anchor zone (right) evaluated at ending horizon $T_{\text{akhir}}$, remaining invariant to category or wallet narrowing. All financial flows, aggregates, and timeline projections SHALL be converted to IDR using the central currency exchange rate utility.

#### Scenario: Display Filtered Aggregate Bar
- **WHEN** any filter (date, wallet, category, or type) is applied or adjusted
- **THEN** a summary bar above the table displays matching transaction count, total income (`+Rp X`), total expense (`−Rp Y`), and net delta (`±Rp Z`) converted into IDR.

#### Scenario: Display Future Projected Net Worth Anchor
- **WHEN** user filters by a date range where $T_{\text{akhir}}$ exceeds the current calendar month (e.g., "Bulan Depan" or a custom future end date)
- **THEN** the right zone displays `PROYEKSI NET WORTH` calculated as Current Net Worth plus all scheduled net income and expense across all accounts up to $T_{\text{akhir}}$ in IDR, accompanied by subtext indicating the projection date.

#### Scenario: Display Present Consolidated Net Worth Anchor
- **WHEN** user filters by "Bulan Ini", "Hari Ini", or views "Semua Waktu" (where $T_{\text{akhir}}$ falls within the current month or is unbounded)
- **THEN** the right zone displays `NET WORTH SAAT INI` showing the live consolidated net worth across all accounts, accompanied by subtext indicating consolidated liquidity position.

#### Scenario: Display Historical Closing Net Worth Anchor
- **WHEN** user filters by a date range where $T_{\text{akhir}}$ precedes the current calendar month (e.g., "Bulan Lalu" or a custom past date range)
- **THEN** the right zone displays `NET WORTH PENUTUPAN` calculated as Current Net Worth minus all net settled transaction inflows and outflows that occurred between $T_{\text{akhir}}$ and the current date in IDR, accompanied by subtext indicating the closing balance date.

#### Scenario: Filter Narrowing Invariance on Global Anchor
- **WHEN** user narrows the filter to a specific category (e.g., "Makan & Minum") or a single wallet while viewing a future or past date range
- **THEN** the left zone updates to reflect only the transactions matching that category/wallet, while the right zone continues to anchor against the total multi-wallet portfolio Net Worth at $T_{\text{akhir}}$ without arithmetic distortion.

#### Scenario: Multi-Currency Conversion for Financial Aggregates and Projections
- **WHEN** the ledger processes transactions from non-IDR wallets (such as USDT)
- **THEN** every transaction amount is automatically multiplied by its currency rate to IDR (e.g. USDT peg rate) before being added to income, expense, net cashflow, or timeline net worth projections.

#### Scenario: Spendable vs Locked Liquidity Breakdown and Accounts Navigation
- **WHEN** user views the right zone anchor for any timeline horizon (future, present, or past)
- **THEN** the anchor displays both total Net Worth and its component breakdown (`● Bebas: Rp X` and `🔒 Cadangan: Rp Y`), accompanied by an interactive `Rincian Akun →` link that navigates to `/accounts` with the matching date filter preset.

### Requirement: Budget Multi-Select Filtering and URL Linking

The ledger studio SHALL provide transaction filtering by budget using a searchable multi-select combobox and support inbound URL navigation with `budgetId` and `budget` query parameters.

#### Scenario: Filter Ledger by Selected Budget
- **WHEN** user selects a budget (e.g. "Jenguk Rumah" or "Belanja Bulanan") from the budget combobox
- **THEN** the ledger filters the transaction feed to only rows whose `transactionBudgetId` matches the selected budget ID
- **THEN** aggregate summary stats and pagination recompute for the matching budget transactions

#### Scenario: Inbound Navigation with Budget Query Parameters
- **WHEN** user navigates to `/ledger?budgetId=budget-123&budget=Jenguk%20Rumah`
- **THEN** the ledger parses `budgetId` from URL parameters and sets the active budget filter
- **THEN** the filter bar renders an active budget chip displaying the budget name with a one-click "x" clear action

### Requirement: Budget Tag Display in Transaction Rows

The ledger studio SHALL display the resolved budget badge alongside the category on transaction rows when a transaction is assigned to a budget.

#### Scenario: Transaction with Assigned Budget
- **WHEN** a transaction has a non-null `transactionBudgetId`
- **THEN** both desktop table row and mobile feed item display the resolved budget name as a distinct subtle tag

### Requirement: Transaction Row Click-to-Detail
Clicking a transaction row in the Ledger table SHALL open the transaction detail drawer.

#### Scenario: Click Row on Desktop Table
- **WHEN** user clicks a transaction row in the desktop tabular grid
- **THEN** the drilldown drawer opens in `transaction-detail` mode for that transaction
- **THEN** the row visually indicates it is the active/selected transaction

#### Scenario: Tap Row on Mobile Feed
- **WHEN** user taps a transaction item in the mobile dense document feed
- **THEN** the drilldown drawer opens in `transaction-detail` mode for that transaction

### Requirement: Ledger Create Transaction Action
The Ledger page header SHALL include a create action that opens the transaction form.

#### Scenario: Click Catat on Desktop
- **WHEN** user clicks the `[+ Catat]` button in the Ledger header area on desktop
- **THEN** the transaction form drawer opens in create mode
