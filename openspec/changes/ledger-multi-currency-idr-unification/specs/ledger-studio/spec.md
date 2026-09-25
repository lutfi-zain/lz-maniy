# Spec Delta: ledger-studio

## MODIFIED Requirements

### Requirement: Full-Width Tabular Transaction Ledger
The ledger studio SHALL render user transactions using a responsive dual-presentation model: a full-width multi-column tabular grid on desktop viewports (>= 768px) and a flat, dense document-style feed with zero horizontal scrolling on mobile viewports (< 768px). Both presentations display Date, Description, Kategori, Dari Akun, Ke Akun, Status, and Amount with tabular numeric alignment, and support configurable pagination bounds. All transaction amounts SHALL display their primary monetary value in IDR (converting foreign currencies via live exchange rates) with native currency amounts displayed as secondary notation.

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
