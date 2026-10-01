# account-dashboard Specification

## Purpose
Renders a consolidated personal financial intelligence dashboard partitioned into high-level KPIs, categorized wallet lists, monthly cashflow with expense breakdown, active spending budgets, savings goals with multi-wallet allocations, and active obligations.

## Requirements

### Requirement: Consolidated Net Worth & Currency Breakdown
The dashboard SHALL display the user's consolidated net worth in IDR, including sub-aggregations by currency and financial institution derived from the primary account detail snapshot, using high-precision typography and tabular numbers without decorative literary serif fonts or ambient background animations.

#### Scenario: Display Consolidated Net Worth
- **WHEN** account detail data is successfully loaded
- **THEN** the dashboard displays the total consolidated net worth with live FX conversion notation and pills showing allocation across each institution (e.g., BCA, Bank Jago, OCBC, GoPay, Bitget, General).

#### Scenario: Filter Wallets by Institution Pill
- **WHEN** a user clicks on an institution pill in the Net Worth card
- **THEN** the wallet list highlights or filters to show only wallets associated with that institution.

### Requirement: Executive Cockpit Operational Workbench
The dashboard SHALL provide a responsive operational workbench at `/` featuring desktop 3-column layout, compact mobile presentation with a 2x2 KPI grid, a Quick Cash institution liquidity bar leading directly into recent mutations, and a persistent sticky bottom navigation bar on mobile viewports (< 768px).

#### Scenario: Scan Daily Financial Cockpit
- **WHEN** user loads the home cockpit route `/`
- **THEN** user can view their entire cash position, recent transaction activity, and critical runway alerts on one screen without opening nested modals or drawers.

#### Scenario: Filter Recent Mutations by Date Range on Cockpit
- **WHEN** user changes the date range preset (e.g. to "Bulan Ini" or "Bulan Depan") in the Cockpit workbench
- **THEN** the recent mutations feed filters dynamically to transactions within that date range.

#### Scenario: Mobile Viewport 2x2 KPI Grid and Quick Cash Bar Hierarchy
- **WHEN** user accesses `/` on a mobile viewport (< 768px)
- **THEN** the top KPI strip renders as a compact 2x2 grid displaying all 4 core indicators above the fold, followed by a streamlined single-row Quick Cash bar with a direct link to `/accounts`, leading immediately into the Recent Mutations feed.

#### Scenario: Sticky Bottom Navigation Bar on Mobile
- **WHEN** user navigates through any studio on a mobile viewport (< 768px)
- **THEN** a fixed bottom navigation bar is anchored in the thumb zone providing one-tap navigation between Cockpit, Ledger, Akun & Bank, and Perencanaan, while topbar navigation links remain hidden.

### Requirement: Standardized Status Indicators & Multi-Currency Aggregations
The dashboard SHALL display account and reserve statuses using a unified visual language (amber lock icon for Cadangan, green dot for Operasional) and compute all total asset values by converting foreign currency balances (USDT/USD) into IDR using live exchange rates/pegs.

#### Scenario: Uniform Status Display
- **WHEN** viewing account status indicators on the cockpit
- **THEN** spendable operational cash is consistently marked with a green indicator and locked reserve cash is marked with an amber lock icon.

#### Scenario: Multi-Currency Total Asset Conversion
- **WHEN** calculating total net worth or total asset holdings
- **THEN** foreign currency balances (such as Bitget USDT) are automatically converted to IDR and included in the grand total.

### Requirement: Partitioned Wallet Accounts
The dashboard SHALL partition wallets into Spendable (unlocked operational cash) and Locked (protected reserves, house rent savings, child doctor funds).

#### Scenario: View Spendable vs Locked Wallets
- **WHEN** a user toggles between "Spendable" and "Locked" tabs
- **THEN** the dashboard displays only the matching wallets along with balance, institution, and last transaction summary.

### Requirement: Monthly Cashflow & Category Breakdown
The dashboard SHALL display monthly total income, total expense, and net savings surplus/deficit, along with an ordered breakdown of expenses by category with percentages and visual tracks.

#### Scenario: View Category Allocation
- **WHEN** monthly cashflow data is displayed
- **THEN** each expense category renders with its name, formatted amount in IDR, percentage of total expenses, and a proportional horizontal bar.

### Requirement: Savings Goals with Derived Linked Wallets
The dashboard SHALL render financial savings goals, displaying target amount, current accumulated amount, progress percentage, remaining days, and a breakdown of all linked backing wallets.

#### Scenario: Display Derived Goal Breakdown
- **WHEN** a goal is derived from multiple wallets (such as "Sewa Rumah 2026")
- **THEN** the goal card lists each contributing wallet, its original currency balance, and the converted IDR value.

### Requirement: Active Obligations
The dashboard SHALL display active debt liabilities and loan receivables with remaining balance, due dates, and status.

#### Scenario: Display Debt and Loan Items
- **WHEN** active debts or loans exist in obligations data
- **THEN** debts render with negative amounts in red and loans render with positive amounts in green, along with due date and status badges.

### Requirement: Verified Identity Display in Topbar and Cockpit
The dashboard SHALL display verified user identity details in the Topbar avatar and user dropdown, and display an editorial greeting in Cockpit.

#### Scenario: Accurate Initials and Name Display
- **WHEN** user profile contains `firstName` and `lastName` (or `fullName`)
- **THEN** Topbar avatar displays two-letter initials computed from `firstName[0] + lastName[0]`
- **THEN** Topbar dropdown displays `fullName`, `email`, formatted WhatsApp number, and membership duration

#### Scenario: Cockpit Personalized Greeting
- **WHEN** user navigates to the Cockpit dashboard (`/`) with an authenticated session
- **THEN** the workspace header displays a personalized greeting reflecting the user's name

### Requirement: Global Create Transaction Triggers
The application shell SHALL provide always-visible triggers to open the transaction form from any route.

#### Scenario: Topbar Create Button on Desktop
- **WHEN** user is authenticated and viewing any protected route on desktop (>= 768px)
- **THEN** a `[+ Catat]` button is visible in the Topbar's right action area
- **THEN** clicking it opens the transaction form drawer in create mode

#### Scenario: BottomNav Center Action on Mobile
- **WHEN** user is authenticated and viewing any protected route on mobile (< 768px)
- **THEN** a center action button (visually distinct from navigation tabs) is present in the BottomNav between the Ledger and Akun tabs
- **THEN** tapping it opens the transaction form drawer in create mode

### Requirement: Skeleton Loading States for Cockpit Widgets
The dashboard SHALL render structured, animated skeleton placeholder states matching the dimensions and layout of each Cockpit widget while API queries are in flight.

#### Scenario: Display KPI Strip Skeletons During Initial Fetch
- **WHEN** user loads the dashboard and `reedrichStore.isLoading` is true
- **THEN** the KPI section renders 4 skeleton cards matching the 2x2 mobile / 4-card desktop grid with subtle pulse animation, preventing cumulative layout shift

#### Scenario: Display Recent Mutations Skeletons
- **WHEN** user views the Mutasi Terkini workbench and transaction data is loading
- **THEN** the feed renders skeleton rows displaying placeholder shapes for description, date, and currency amounts

#### Scenario: Display Bank and Allocation Skeletons
- **WHEN** the operational workbench is loading account detail data
- **THEN** the Bank Accounts widget and Allocation widget render proportional skeleton bars and rows

### Requirement: Persistent Date Filter in Mutasi Terkini Feed
The Cockpit "Mutasi Terkini" feed SHALL synchronize its date filtering with the central `dateFilterStore`, sharing the exact same timeframe perspective as `/ledger`, `/accounts`, and `/planning`.

#### Scenario: Synchronized Date Horizon in Cockpit
- **WHEN** user changes the date filter to "Bulan Depan" in `/ledger` and returns to `/`
- **THEN** the Mutasi Terkini header displays "Bulan Depan" and filters displayed mutations to the active date range

#### Scenario: Adjusting Date Filter from Cockpit Header
- **WHEN** user selects a new preset or clicks "Reset" in the Cockpit Mutasi Terkini header
- **THEN** `dateFilterStore` updates globally, persisting the new selection across all views

### Requirement: Deduplicated Cockpit Feed Requests
The cockpit recent-transactions feed SHALL issue at most one in-flight network request per distinct filter state, cancelling superseded requests instead of duplicating them.

#### Scenario: Single Request Per Filter State
- **WHEN** the cockpit mounts or the active date range changes
- **THEN** any prior in-flight feed request is aborted before a new one starts
- **AND** the network log shows exactly one `/api/v1/transactions` request for that filter state.

#### Scenario: Rapid Navigation Cancels Stale Feed
- **WHEN** the user navigates away from the cockpit while its feed request is still in flight
- **THEN** the orphaned request is aborted and its late response never overwrites newer state.

### Requirement: Account Balance Snapshot and Point-in-Time Filtering
The system MUST retrieve user wallet balances and portfolio metrics using server-driven point-in-time filtering parameters (`startDate`, `endDate`, and status `filter`) so that selecting a date range in the Account & Banking dashboard immediately and accurately reflects wallet balances for that specific timeframe.

#### Scenario: User changes date range in Account & Banking
- **WHEN** the user selects a custom date range or preset in `/accounts` (e.g. `startDate: '2026-08-01'`, `endDate: '2026-08-31'`)
- **THEN** the system MUST invoke the server-driven wallet query with those date bounds
- **AND** the wallet card list and aggregated portfolio KPI tiles MUST update to show the historical closing balances for that period rather than falling back to an empty in-memory transaction list.

#### Scenario: Server error or offline fallback during point-in-time fetch
- **WHEN** the point-in-time wallet request fails or the network is offline
- **THEN** the system MUST retain the last known balance snapshot and display an unobtrusive inline status warning without crashing the view.

### Requirement: Interactive Account Navigation from Cockpit
The system MUST allow users to inspect individual wallet details and recent mutations directly from the Cockpit bank accounts widget without unwanted full-page navigation.

#### Scenario: User clicks a bank or sub-wallet row in Cockpit
- **WHEN** the user clicks an individual bank account or sub-wallet row in `CockpitBankWidget`
- **THEN** the system MUST open the wallet drawer (`WalletDrawerContent`) with the account metadata and recent transactions
- **AND** the user MUST remain on the Cockpit page unless clicking the global "Lihat Semua Akun" / "All Accounts" navigation link.

### Requirement: Safe-to-Spend Runway & Forward Cashflow Projections
The dashboard SHALL display the user's mathematical safe-to-spend runway, daily allowance, forward-looking 30-day cashflow commitments, and support one-tap realization of planned recurring occurrences directly from the Cockpit workbench.

#### Scenario: Render Mathematical Safe-to-Spend Runway
- **WHEN** summary data is successfully loaded from Reedrich API
- **THEN** the Cockpit KPI strip displays the true `safeToSpend` runway amount and the calculated `dailySafeToSpend` allowance for the remaining days in the active period
- **THEN** the spendable wallet balance and safe-to-spend runway are clearly distinguished

#### Scenario: Deficit Runway Warning Display
- **WHEN** `safeToSpendDetails.isDeficit` is true (planned commitments exceed spendable cash)
- **THEN** the Cockpit alert banner dynamically displays a prominent deficit warning with the negative deficit amount and negative daily allowance
- **THEN** the banner indicates that planned commitments and active debts exceed current liquid reserves without relying on hardcoded goal string searches

#### Scenario: 30-Day Forward Cashflow Projections Widget
- **WHEN** `cashflowProjections` are returned by the summary engine
- **THEN** the dashboard renders an upcoming commitments timeline showing the lookahead period, projected net change, and chronological list of upcoming scheduled bill/income events with dates and amounts

#### Scenario: One-Tap Planned Recurring Realization
- **WHEN** user clicks the "Terapkan / Bayar" action on an upcoming planned transaction linked to a recurring template
- **THEN** the client dispatches an atomic realization request (`/api/v1/recurring-templates/{templateId}/apply`)
- **THEN** on success, the transaction transitions to realized status and wallet balances refresh immediately
