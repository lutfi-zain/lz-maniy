# Proposal

## Why

The current Maniyy V2 interface utilizes informal, hardcoded Indonesian terminology and localized formatters (`'id-ID'` numbers and dates) mixed haphazardly throughout 75+ UI components. Standardizing all user-facing strings to international financial English (GAAP/IFRS standard terminology) and establishing a reactive, compile-time type-safe i18n architecture provides an institutional-grade wealth cockpit foundation while enabling seamless bilingual support (English as default, Indonesian as fallback).

## What Changes

- **i18n Foundation & Runtime Engine**:
  - Zero-bloat, reactive Svelte 5 runes-based translation engine (`i18nStore`) under `apps/web/src/lib/i18n/`.
  - Type-safe dictionary schema (`TranslationSchema`) inferred from the canonical English dictionary (`en.ts`) with Indonesian counterpart (`id.ts`).
  - Active locale persistence via `localStorage` and integration with `settingsStore` (fallback to English `'en'`).
  - Lightweight parameter interpolation (`t('namespace.key', { ...params })`).

- **Financial Terminology Standardization (GAAP/IFRS-aligned)**:
  - Standardize terminology across all surfaces:
    - "Kekayaan Bersih" / "Konsolidasi" → **Net Worth** / **Consolidated Net Worth**
    - "Arus Kas" / "Arus Kas Bersih" → **Cashflow** / **Net Cashflow**
    - "Pemasukan" → **Inflow** (ledger) / **Income** (summary/categories)
    - "Pengeluaran" → **Outflow** (ledger) / **Expenses** (summary/categories)
    - "Mutasi" / "Mutasi Terkini" → **Transactions** / **Recent Transactions**
    - "Saldo" → **Balance** (Spendable Balance, Allocated Funds)
    - "Pagu Anggaran" → **Budget** / **Budget Allowance**
    - "Target Tabungan" → **Savings Goals**
    - "Kewajiban / Hutang" → **Liabilities** / **Payables**
    - "Piutang" → **Receivables**
    - "Tagihan Rutin / Transaksi Terencana" → **Recurring Bills / Planned Transactions**
    - "Dompet & Rekening" → **Accounts & Wallets**
    - "Perencanaan" → **Planning Studio**
    - "Transfer Antar Dompet" → **Account Transfer**

- **Locale-Aware Financial & Date Formatters**:
  - Currency formatting (`fmtCurrency`, `fmtIDR`) dynamically adjusts based on active locale:
    - English (`en-US`): standard comma separators and dot decimals (`Rp 14,230,897.52`).
    - Indonesian (`id-ID`): standard period separators and comma decimals (`Rp 14.230.897,52`).
  - Compact number notation (`fmtCompactIDR`):
    - English (`en`): `K` (Thousand), `M` (Million), `B` (Billion) — e.g. `Rp 5.5M`, `Rp 250K`.
    - Indonesian (`id`): `rb` (Ribu), `jt` (Juta), `M` (Miliar).
  - Date & Horizon formatters (`dFmt`, `dFmtTime`, `mLabel`, `DateRangePicker`):
    - English: `Sep 29, 2026`, `This Month`, `Next Month`, `Last Month`, `All Time`.
    - Indonesian: `29 Sep 2026`, `Bulan Ini`, `Bulan Depan`, `Bulan Lalu`, `Semua Waktu`.

- **Component Refactoring Across All Domains**:
  - Global Navigation & Layout (`Topbar.svelte`, `BottomNav.svelte`, User Profile Menu).
  - Cockpit Dashboard (`/`): KPI widgets, allocation graphs, recent transaction list, alert banners.
  - Ledger Studio (`/ledger`): Multi-period Horizon Board, table columns, filter toolbar, PeriodSummaryCard.
  - Accounts & Banking (`/accounts`): Account matrices, wallet cards, institution badges.
  - Planning Studio (`/planning`): Budgets, Goals, Obligations, Category Studio.
  - Entity Drawers & CRUD Forms: Transaction Drawer, Wallet Drawer/Form, Category Drawer/Form, Goal Drawer/Form, Budget Drawer/Form, Recurring Drawer/Form.

- **Locale Switching Control**:
  - Clean language switcher in the Topbar User Profile dropdown (`EN` | `ID`) allowing instant reactive switching without page reload.

## Capabilities

### New Capabilities
- `financial-i18n`: Type-safe Svelte 5 runes dictionary engine, locale persistence, and localized financial/date formatters for English and Indonesian.

### Modified Capabilities
- `account-dashboard`: UI labels, KPI banners, and summary cards rendered via `financial-i18n` with standardized financial English terminology.
- `account-matrix`: Wallet groups, balances, and account creation/editing forms standardized to English.
- `planning-studio`: Budgets, savings goals, liabilities, obligations, and category matrix workspaces rendered with standard financial English terms.
- `ledger-studio`: Horizon Board columns, period metrics, filter bars, and dense transaction lists standardized to English.

## Scope Boundaries

### In Scope
- Creation of type-safe i18n store, translation dictionary files (`en.ts`, `id.ts`), and localized formatting helpers in `apps/web`.
- Full audit and conversion of all UI strings in `apps/web/src` (Cockpit, Ledger, Accounts, Planning, Drawers, Forms).
- Dynamic locale switcher UI inside Topbar user profile dropdown.
- Unit tests for the i18n store, dictionary key completeness, and localized formatting helpers.

### Non-Goals
- Modifying backend Cloudflare Worker API responses or D1 database records (e.g., Reedrich API category/wallet names stored in the database remain as user-created data).
- AI Agent chat responses internalization (the agent communicates according to prompt directives).
- Adding additional locales beyond English (`en`) and Indonesian (`id`) at this stage.
