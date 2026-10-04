## MODIFIED Requirements

### Requirement: Dynamic Filtered Financial Aggregates
The ledger studio SHALL render a dual-layer summary strip partitioned into a localized filter metrics zone (left) and an independent global point-in-time Net Worth anchor zone (right) evaluated at ending horizon $T_{\text{akhir}}$, remaining invariant to category or wallet narrowing. All financial flows, aggregates, and timeline projections SHALL be converted to IDR using the central currency exchange rate utility.

#### Scenario: Display Filtered Aggregate Bar
- **WHEN** any filter (date, wallet, category, or type) is applied or adjusted
- **THEN** a summary bar above the table displays matching transaction count, total income (`+Rp X`), total expense (`−Rp Y`), and net delta (`±Rp Z`) converted into IDR
- **AND** when viewing an active calendar month or date window whose transactions exceed the single-page limit (50 items), the cashflow totals reflect the complete period flow without pagination truncation.

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

### Requirement: Server-Driven Horizon Board Projections
The Ledger Horizon Board SHALL obtain per-period Net Worth, Spendable, and Committed values from the server-computed roll-forward projection endpoint (`GET /api/v1/analytics/horizon`) rather than calculating them client-side from a local transaction dataset.

#### Scenario: Horizon Board Displays Server-Projected Net Worth
- **WHEN** user switches to the Horizon Board view on `/ledger` with periods spanning future months or the current calendar month
- **THEN** each period column's `PeriodSummaryCard` displays the server-computed `netWorth.total`, `netWorth.spendable`, and `netWorth.locked` values
- **AND** when rendering the current calendar month, the net worth metric displays the label `PROYEKSI AKHIR BULAN` (or `Closing Month-End Projection`) to distinguish the post-planned position from today's live balance
- **AND** consecutive future months with positive net cashflow display monotonically increasing Net Worth values.

#### Scenario: Horizon Board Cashflow Uses Period Column Data
- **WHEN** the Horizon Board renders a period column
- **THEN** the cashflow section (Inflow, Outflow, Net) continues to derive from the column's locally-fetched period transactions
- **AND** the Net Worth section derives from the server horizon projection for that period.

#### Scenario: Server Projection Failure Degrades Visibly
- **WHEN** the `fetchHorizonProjections()` call fails (network error, timeout, or non-2xx response)
- **THEN** the Horizon Board displays a visible indicator that projections are unavailable
- **AND** does NOT silently fall back to stale or zero-delta calculations.
