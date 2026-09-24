# Spec Delta: account-matrix

## MODIFIED Requirements

### Requirement: Granular Account Status & Currency Breakdown
Each wallet within an institution group SHALL display its account name, purpose, access status (Operasional vs Cadangan with standardized icons and tooltips), currency ticker directly (`IDR`, `USDT`) without redundant "Mata Uang" or "Tipe" labels, exact timestamp for its last transaction, and support sorting, filtering, and grouping controls.

#### Scenario: View Account Allocation Without Redundant Labels
- **WHEN** inspecting accounts under `/accounts`
- **THEN** each row displays the currency ticker directly (e.g. `IDR` or `USDT`) and exact last transaction date/time without displaying redundant "Mata Uang:" or "Tipe:" text.

#### Scenario: Filter and Sort Accounts
- **WHEN** user searches for a wallet name or changes sorting (by balance, name, or last transaction date)
- **THEN** the account list updates reactively to match the criteria.
