# Spec Delta: account-dashboard

## ADDED Requirements

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

---

### Requirement: Persistent Date Filter in Mutasi Terkini Feed

The Cockpit "Mutasi Terkini" feed SHALL synchronize its date filtering with the central `dateFilterStore`, sharing the exact same timeframe perspective as `/ledger`, `/accounts`, and `/planning`.

#### Scenario: Synchronized Date Horizon in Cockpit
- **WHEN** user changes the date filter to "Bulan Depan" in `/ledger` and returns to `/`
- **THEN** the Mutasi Terkini header displays "Bulan Depan" and filters displayed mutations to the active date range

#### Scenario: Adjusting Date Filter from Cockpit Header
- **WHEN** user selects a new preset or clicks "Reset" in the Cockpit Mutasi Terkini header
- **THEN** `dateFilterStore` updates globally, persisting the new selection across all views
