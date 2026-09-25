# ledger-studio Specification

## Purpose
Provides a full-width dedicated transaction ledger studio at `/ledger` featuring super dynamic multi-faceted filtering (date range presets, custom picker, wallet multi-select by bank, category multi-select, transaction types, status, and search), responsive pagination, and real-time aggregate totals.

## Requirements

### Requirement: Full-Width Tabular Transaction Ledger
The ledger studio SHALL render user transactions using a responsive dual-presentation model: a full-width multi-column tabular grid on desktop viewports (>= 768px) and a flat, dense document-style feed with zero horizontal scrolling on mobile viewports (< 768px). Both presentations display Date, Description, Kategori, Dari Akun, Ke Akun, Status, and Amount with tabular numeric alignment, and support configurable pagination bounds.

#### Scenario: View Transaction Rows with Category Column
- **WHEN** user navigates to `/ledger` on a desktop viewport
- **THEN** each transaction row explicitly displays the resolved category name alongside its description, source wallet, and amount within a high-density tabular grid.

#### Scenario: Configure Pagination Page Size
- **WHEN** user selects a page size limit (25, 50, or 100)
- **THEN** the ledger renders the requested number of rows per page with a bounded navigation stepper.

#### Scenario: Mobile Viewport Dual-Presentation Dense Transaction Feed
- **WHEN** user navigates to `/ledger` on a mobile viewport (< 768px)
- **THEN** transactions render as a vertical dense document feed without horizontal table scrolling, displaying Description and Amount on the primary line, accompanied by Date, Category tag, and Account routing on the secondary line.

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
The ledger studio SHALL render a dual-layer summary strip partitioned into a localized filter metrics zone (left) and an independent global point-in-time Net Worth anchor zone (right) evaluated at ending horizon $T_{\text{akhir}}$, remaining invariant to category or wallet narrowing.

#### Scenario: Display Filtered Aggregate Bar
- **WHEN** any filter (date, wallet, category, or type) is applied or adjusted
- **THEN** a summary bar above the table displays matching transaction count, total income (`+Rp X`), total expense (`−Rp Y`), and net delta (`±Rp Z`).

#### Scenario: Display Future Projected Net Worth Anchor
- **WHEN** user filters by a date range where $T_{\text{akhir}}$ exceeds the current calendar month (e.g., "Bulan Depan" or a custom future end date)
- **THEN** the right zone displays `PROYEKSI NET WORTH` calculated as Current Net Worth plus all scheduled net income and expense across all accounts up to $T_{\text{akhir}}$, accompanied by subtext indicating the projection date.

#### Scenario: Display Present Consolidated Net Worth Anchor
- **WHEN** user filters by "Bulan Ini", "Hari Ini", or views "Semua Waktu" (where $T_{\text{akhir}}$ falls within the current month or is unbounded)
- **THEN** the right zone displays `NET WORTH SAAT INI` showing the live consolidated net worth across all accounts, accompanied by subtext indicating consolidated liquidity position.

#### Scenario: Display Historical Closing Net Worth Anchor
- **WHEN** user filters by a date range where $T_{\text{akhir}}$ precedes the current calendar month (e.g., "Bulan Lalu" or a custom past date range)
- **THEN** the right zone displays `NET WORTH PENUTUPAN` calculated as Current Net Worth minus all net settled transaction inflows and outflows that occurred between $T_{\text{akhir}}$ and the current date, accompanied by subtext indicating the closing balance date.

#### Scenario: Filter Narrowing Invariance on Global Anchor
- **WHEN** user narrows the filter to a specific category (e.g., "Makan & Minum") or a single wallet while viewing a future or past date range
- **THEN** the left zone updates to reflect only the transactions matching that category/wallet, while the right zone continues to anchor against the total multi-wallet portfolio Net Worth at $T_{\text{akhir}}$ without arithmetic distortion.
