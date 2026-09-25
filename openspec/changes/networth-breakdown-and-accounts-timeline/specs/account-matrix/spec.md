# Spec Delta: account-matrix

## MODIFIED Requirements

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
