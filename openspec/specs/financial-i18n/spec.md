# financial-i18n Specification

## Purpose
Provides a lightweight, compile-time type-safe internationalization (i18n) and financial standardization engine for Maniyy V2, enabling reactive locale switching (English as primary, Indonesian as secondary) and consistent GAAP/IFRS financial terminology and localized number/date formatting across all workspaces.

## Requirements

### Requirement: Type-Safe Reactive i18n Dictionary Engine
The web application SHALL provide a reactive translation store that resolves structured keys against locale dictionaries, with full compile-time type safety preventing missing or invalid translation keys.

#### Scenario: Translate static key in active locale
- **WHEN** the active locale is `'en'` and a component requests `t('nav.cockpit')`
- **THEN** the system returns `"Cockpit"`
- **WHEN** the active locale is `'id'` and a component requests `t('nav.cockpit')`
- **THEN** the system returns `"Kokpit"`

#### Scenario: Translate dynamic parameterized string
- **WHEN** a component invokes `t('planning.categories.count', { count: 5 })` in `'en'`
- **THEN** the system interpolates the parameter and returns `"5 categories"`
- **WHEN** invoked in `'id'`
- **THEN** the system returns `"5 kategori"`

#### Scenario: Fallback on missing key
- **WHEN** a translation key is missing or undefined in a secondary locale
- **THEN** the system falls back gracefully to the canonical English string without throwing runtime errors or blanking the UI.

### Requirement: GAAP/IFRS Financial English Terminology Standardization
The application SHALL render all financial headers, metrics, KPI strips, account lists, and form inputs using international financial English terminology when the English locale is active.

#### Scenario: Inspect Net Worth and Cashflow metrics
- **WHEN** the user views the Cockpit or Ledger in English locale
- **THEN** net asset valuation is labeled as `"Net Worth"` or `"Consolidated Net Worth"` (not "Kekayaan Bersih")
- **AND** period operational flows are labeled as `"Inflow"` / `"Income"` and `"Outflow"` / `"Expenses"` (not "Pemasukan" and "Pengeluaran")
- **AND** net period performance is labeled as `"Net Cashflow"` (not "Net Arus Kas").

#### Scenario: Inspect Accounts and Balances
- **WHEN** user views Accounts & Banking in English locale
- **THEN** unallocated funds are labeled as `"Spendable Balance"` or `"Safe to Spend"`
- **AND** derived allocations for goals are labeled as `"Allocated Funds"` or `"Committed Capital"`
- **AND** transfers between internal wallets are labeled as `"Account Transfer"` (not "Transfer Antar Dompet").

#### Scenario: Inspect Planning Studio workbenches
- **WHEN** user navigates to `/planning` in English locale
- **THEN** sub-tabs display `"Budgets"`, `"Savings Goals"`, `"Liabilities"`, and `"Categories"`
- **AND** liabilities section differentiates between `"Debts"` (payables) and `"Loans"` (receivables)
- **AND** scheduled cashflows are labeled as `"Recurring Bills"` and `"Planned Transactions"`.

### Requirement: Locale-Aware Currency and Numeric Formatting
The financial utility layer SHALL format numeric amounts, currency denominations, and compact summaries in accordance with the active locale's numeric conventions.

#### Scenario: Format Indonesian Rupiah currency in English
- **WHEN** active locale is `'en'` and the system formats amount `14230897.52`
- **THEN** currency helper outputs `"Rp 14,230,897.52"` using comma thousands separator and period decimal separator.

#### Scenario: Format Indonesian Rupiah currency in Indonesian
- **WHEN** active locale is `'id'` and the system formats amount `14230897.52`
- **THEN** currency helper outputs `"Rp 14.230.897,52"` using period thousands separator and comma decimal separator.

#### Scenario: Format compact notation in English
- **WHEN** active locale is `'en'` and a badge renders compact amount `5500000`
- **THEN** helper outputs `"Rp 5.5M"`
- **WHEN** the amount is `250000`
- **THEN** helper outputs `"Rp 250K"`.

#### Scenario: Format compact notation in Indonesian
- **WHEN** active locale is `'id'` and a badge renders compact amount `5500000`
- **THEN** helper outputs `"Rp 5,5 jt"`
- **WHEN** the amount is `250000`
- **THEN** helper outputs `"Rp 250 rb"`.

### Requirement: Locale-Aware Date and Horizon Interval Formatting
The system SHALL format transaction timestamps, month keys, and date horizon presets according to the active locale.

#### Scenario: Format transaction date in English
- **WHEN** active locale is `'en'` and a date string `"2026-09-29"` is formatted
- **THEN** the formatted result renders `"Sep 29, 2026"` (short month first).

#### Scenario: Format date range presets in English
- **WHEN** active locale is `'en'` and user views the `DateRangePicker`
- **THEN** presets render as `"This Month"`, `"Next Month"`, `"Last Month"`, `"Today"`, and `"All Time"`.

#### Scenario: Format date range presets in Indonesian
- **WHEN** active locale is `'id'` and user views the `DateRangePicker`
- **THEN** presets render as `"Bulan Ini"`, `"Bulan Depan"`, `"Bulan Lalu"`, `"Hari Ini"`, and `"Semua Waktu"`.

### Requirement: Reactive Locale Switching and Preference Persistence
The application SHALL allow users to toggle their preferred language and persist this selection across browser reloads.

#### Scenario: Switch locale from user menu
- **WHEN** user opens the Topbar user profile dropdown and clicks the `"EN"` or `"ID"` language selector
- **THEN** all rendered UI text, dates, and number formats instantly update reactively without triggering a full page refresh
- **AND** the preference is stored in `localStorage` under `maniyy_locale`.

#### Scenario: Restore locale on application initialization
- **WHEN** a user visits the application with a previously saved locale in `localStorage`
- **THEN** the application initializes with that saved locale
- **AND** defaults to `'en'` if no preference has been saved.
