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

### Requirement: Structured Skeleton Loading Presentation for Ledger Studio
The ledger studio SHALL render structured skeleton placeholder rows and summary strip indicators while transactions or live snapshots are being fetched from the backend.

#### Scenario: Display Tabular Skeletons During Ledger Query
- **WHEN** user visits `/ledger` and `reedrichStore.isLedgerLoading` is true
- **THEN** the transaction container displays an animated skeleton table header and multiple skeleton rows matching column widths, eliminating layout shift
- **THEN** the summary strip renders skeleton badges for counts and monetary aggregates

### Requirement: Multi-Period Horizon Board View
The ledger studio SHALL provide a multi-period wrapping grid view displaying user-selected monthly horizon columns, with each column rendering transactions and cashflow metrics without savings goal pacing.

#### Scenario: View Cashflow Columns without Goal Pacing
- **WHEN** user switches to the `Horizon Board` view on `/ledger`
- **THEN** each monthly period column renders the transaction items and the `PeriodSummaryCard`
- **AND** the summary card renders cashflow metrics (In, Out, Net) and point-in-time Net Worth breakdown (Closing Net Worth, Spendable, Committed)
- **AND** does NOT render any savings goal progress bars, milestones, or pacing targets.

#### Scenario: Toggle Between List and Horizon Board
- **WHEN** user views the view mode switcher on `/ledger`
- **THEN** the first toggle option is labeled "List" with a table icon
- **AND** the second toggle option is labeled "Horizon Board" with a calendar icon
- **AND** clicking either toggle immediately transitions the viewport between high-density tabular list and multi-period column board.

### Requirement: Horizon Board Period Maximize Action
Each period column in the Ledger Horizon Board SHALL provide a Maximize action button to inspect that single month in the primary List view.

#### Scenario: Click Column Maximize Button
- **WHEN** user clicks the Maximize button (adjacent to the Quick-Add Plus button) in a period column header (e.g., "Oktober 2026")
- **THEN** the global date filter is updated to cover that exact period (`2026-10-01` to `2026-10-31`)
- **AND** the ledger view mode is switched to `List`
- **AND** the ledger table immediately displays all transactions belonging to that specific month.

### Requirement: In-Memory Ledger Filter Persistence Across Navigation
Active filter selections on the Ledger studio SHALL persist in memory across SPA page navigation until the browser session is reloaded.

#### Scenario: Retain Filters After Navigating Away and Returning
- **WHEN** user selects specific wallet filters, category filters, transaction type filters, or enters a search query on `/ledger`
- **AND** navigates to `/accounts` or `/planning`
- **AND** subsequently navigates back to `/ledger`
- **THEN** all previously chosen wallet IDs, category IDs, budget IDs, type, status, and search keywords remain active and applied.

#### Scenario: Reset Filters on Browser Page Refresh
- **WHEN** user reloads the browser tab (F5 or hard refresh)
- **THEN** ledger filters reset to their default unconstrained state.

### Requirement: Server-Side Filtered Pagination and Keyword Search
The ledger studio SHALL fetch transaction rows on-demand from the server based on current active filter selections, search keywords, and page offset using the backend envelope metadata.

#### Scenario: On-Demand Paged Ledger Query with Keyword
- **WHEN** user views `/ledger` and enters a search keyword (e.g., "Alfamart") or applies wallet, category, type, and date filters
- **THEN** the ledger studio queries `/api/v1/transactions` with the exact active filters, `q=Alfamart`, `envelope=true`, `limit: pageSize`, and `offset: (currentPage - 1) * pageSize`
- **AND** displays the returned rows without loading unrequested historical transactions
- **AND** displays the accurate total row count and total page count directly from `pagination.total` and `pagination.totalPages`.

#### Scenario: Pagination Cursor Availability
- **WHEN** `pagination.hasNext` is true
- **THEN** the pagination controls mark "Berikutnya" (Next) as enabled
- **WHEN** `pagination.hasNext` is false
- **THEN** "Berikutnya" is disabled to signal the end of the query results.

### Requirement: Card-Level Independent Horizon Period Fetching
Each period column in the multi-period Horizon Board SHALL independently fetch and compute its own transactions and metrics.

#### Scenario: Localized Column Query Execution
- **WHEN** the Horizon Board renders multiple period columns (e.g. 12 months)
- **THEN** each column independently requests `/api/v1/transactions?startDate={colStart}&endDate={colEnd}&envelope=true&limit=50` through the concurrency limiter pool
- **AND** displays its own dedicated skeleton loader while its request is in transit
- **AND** renders its transaction list and cashflow metrics immediately upon arrival without waiting for sibling columns.

#### Scenario: Isolated Column Network Error Handling
- **WHEN** an individual period column fails to fetch due to a network interruption
- **THEN** only that specific column renders an error badge with a retry action
- **AND** all other successfully loaded columns remain fully interactive.

### Requirement: Context-Aware Ledger Horizon Toolbar
The Ledger studio toolbar SHALL conditionally hide the global `DateRangePicker` when the multi-period Horizon Board view is active.

#### Scenario: Hide Date Range Picker in Horizon Mode
- **WHEN** user selects `Horizon Board` view mode on `/ledger`
- **THEN** the top `DateRangePicker` is hidden from the filter toolbar
- **AND** when user selects `List` view mode, the `DateRangePicker` is restored.

### Requirement: Horizon Period Column Pagination
The multi-period horizon column MUST support loading additional transactions beyond the initial batch to prevent truncation.

#### Scenario: Period contains more transactions than the initial limit
- **WHEN** a period column's transaction envelope indicates `pagination.hasNext === true`
- **THEN** the column MUST display an intuitive "Muat Lebih Banyak" / "Load More" action or infinite scroll sentinel
- **AND** triggering it MUST fetch the next page via `offset` and append the new transactions to the column list.

### Requirement: Cockpit Recent Ledger Click Interaction
The Cockpit recent transaction list MUST provide direct item inspection without forcing the user to switch routes.

#### Scenario: User clicks a transaction row in Cockpit
- **WHEN** the user clicks any transaction row in `CockpitRecentLedger`
- **THEN** the transaction detail and edit drawer MUST open with that transaction pre-populated
- **AND** the Cockpit view MUST remain visible in the background.

### Requirement: Server-Driven Horizon Board Projections
The Ledger Horizon Board SHALL obtain per-period Net Worth, Spendable, and Committed values from the server-computed roll-forward projection endpoint (`GET /api/v1/analytics/horizon`) rather than calculating them client-side from a local transaction dataset.

#### Scenario: Horizon Board Displays Server-Projected Net Worth
- **WHEN** user switches to the Horizon Board view on `/ledger` with periods spanning future months
- **THEN** each period column's `PeriodSummaryCard` displays the server-computed `netWorth.total`, `netWorth.spendable`, and `netWorth.locked` values
- **AND** consecutive future months with positive net cashflow display monotonically increasing Net Worth values.

#### Scenario: Horizon Board Cashflow Uses Period Column Data
- **WHEN** the Horizon Board renders a period column
- **THEN** the cashflow section (Inflow, Outflow, Net) continues to derive from the column's locally-fetched period transactions
- **AND** the Net Worth section derives from the server horizon projection for that period.

#### Scenario: Server Projection Failure Degrades Visibly
- **WHEN** the `fetchHorizonProjections()` call fails (network error, timeout, or non-2xx response)
- **THEN** the Horizon Board displays a visible indicator that projections are unavailable
- **AND** does NOT silently fall back to stale or zero-delta calculations.

### Requirement: Server-Driven List View Net Worth Anchor
The Ledger List View right-zone Net Worth anchor SHALL obtain projected and historical Net Worth values from a server-computed source rather than a client-side calculation over a local transaction dataset.

#### Scenario: Future Date Filter Shows Server-Projected Net Worth
- **WHEN** user filters the ledger to a future date range (e.g., "Bulan Depan" or a custom future end date)
- **THEN** the right-zone anchor displays `PROYEKSI NET WORTH` with the server-computed projected amount
- **AND** the projected amount reflects all planned transactions between today and the filter end date.

#### Scenario: Historical Date Filter Shows Correct Closing Net Worth
- **WHEN** user filters the ledger to a past date range (e.g., "Bulan Lalu")
- **THEN** the right-zone anchor displays `NET WORTH PENUTUPAN` with the server-computed historical closing amount
- **AND** the closing amount reflects the portfolio state at the end of that historical period.

#### Scenario: Present Month Shows Live Net Worth
- **WHEN** user views the default "Bulan Ini" or "Semua Waktu" filter
- **THEN** the right-zone anchor displays `NET WORTH SAAT INI` with the live consolidated net worth from the snapshot
- **AND** Spendable and Committed breakdown reflects live wallet locked status.

### Requirement: Horizon Column Automatic Infinite Scroll
The Ledger Horizon Board period column SHALL automatically fetch and append the next page of transactions as the user scrolls near the bottom of the column's transaction container, replacing manual click-to-paginate controls.

#### Scenario: User Scrolls Near Bottom of Transaction List
- **WHEN** user scrolls down a horizon period column and the bottom sentinel enters the scrollport
- **AND** `hasNext` is true and a query is not already in flight
- **THEN** the column automatically dispatches a query for the next page of transactions with `offset = periodTransactions.length`
- **AND** newly fetched transactions are seamlessly appended to the list without resetting scroll position.

#### Scenario: Sentinel Indicates Loading State
- **WHEN** the next page query is in flight
- **THEN** the bottom sentinel renders a subtle loading indicator
- **AND** once `hasNext` becomes false, the sentinel is removed and an end-of-list indicator or spacing is rendered.

### Requirement: Immutable Server-Anchored Horizon Cashflow
The Ledger Horizon Board `PeriodSummaryCard` SHALL source all period cashflow metrics (`income`, `expense`, `net`) directly and immutably from the server-computed horizon projection (`srvPeriod.cashflow`).

#### Scenario: Cashflow Remains Invariant During Scroll
- **WHEN** user views a horizon period column with 80 total transactions where only 50 are initially loaded
- **THEN** the summary card displays the complete 80-transaction cashflow totals from the server
- **AND** scrolling down to auto-fetch the remaining 30 transactions does NOT alter or recalculate the summary card cashflow values.

### Requirement: Custom Date Range Horizon Periods
The Ledger Horizon Board SHALL support adding, displaying, and navigating arbitrary date intervals (e.g. `2026-09-25` to `2026-10-24`) alongside canonical calendar months (`YYYY-MM`).

#### Scenario: Add Custom Date Interval via Period Card
- **WHEN** user opens `AddPeriodCard` and selects a custom start date and end date
- **THEN** a new period key formatted as `YYYY-MM-DD_YYYY-MM-DD` is appended to active periods
- **AND** a new horizon column renders covering that specific date interval.

#### Scenario: Custom Interval Header Formatting
- **WHEN** a horizon column represents a custom date interval (e.g., `2026-09-25_2026-10-24`)
- **THEN** the column header renders a formatted localized date range (e.g. `25 Sep – 24 Okt 2026`) instead of a single month title.

#### Scenario: Maximize Custom Interval to List View
- **WHEN** user clicks the Maximize button on a custom date interval column
- **THEN** the global date filter is updated to `preset: 'custom'` with the column's exact `startDate` and `endDate`
- **AND** the ledger transitions to List view showing that custom interval.
