# Spec Delta: ledger-studio

## MODIFIED Requirements

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
