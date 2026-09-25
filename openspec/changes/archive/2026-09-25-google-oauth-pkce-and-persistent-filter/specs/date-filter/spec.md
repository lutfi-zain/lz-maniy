# Spec Delta: date-filter

## Purpose

Establishes a unified, persistent global date filter state synchronized with browser storage, preserving user-selected timeframe perspectives across all dashboard studios and views while enforcing strict reset rules.

## ADDED Requirements

### Requirement: Persistent Global Date Filter Synchronization

The application MUST maintain date range filter state (`preset`, `startDate`, `endDate`) in a shared reactive store backed by `localStorage`.

#### Scenario: First Launch Without Storage
- **WHEN** user opens the application for the first time or with clear browser storage
- **THEN** `dateFilterStore` initializes with preset `this_month`
- **THEN** `startDate` and `endDate` are computed to cover the first and last day of the current calendar month

#### Scenario: Cross-Route Navigation Persistence
- **WHEN** user changes the date filter to "Bulan Depan" (e.g. October 2026) on `/ledger`
- **THEN** `dateFilterStore` saves the selection to `localStorage` under `maniyy_date_filter`
- **THEN** when user navigates to `/accounts` or `/planning` or reloads the browser, the date range remains set to "Bulan Depan" (01 Okt - 31 Okt) without resetting

---

### Requirement: Strict Reset Boundaries

The application MUST preserve user-selected date ranges across route transitions and ONLY reset to default under explicit, deliberate conditions.

#### Scenario: Manual Reset Action
- **WHEN** user clicks the "Reset Filter" button in the control bar
- **THEN** `dateFilterStore` clears `maniyy_date_filter` from `localStorage`
- **THEN** date range returns to `this_month` (current month)
- **THEN** all listening views recompute balances and transactions for the current month

#### Scenario: Manual Preset or Range Change
- **WHEN** user selects a different preset (e.g. "Bulan Lalu") or clicks custom calendar dates in `DateRangePicker`
- **THEN** `dateFilterStore` updates with the newly selected range and overwrites `maniyy_date_filter` in `localStorage`

#### Scenario: User Logout Reset
- **WHEN** user logs out of the application
- **THEN** `dateFilterStore` purges `maniyy_date_filter` from `localStorage`
- **THEN** internal state reverts to `this_month` default for the next session
