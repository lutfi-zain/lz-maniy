# Spec Delta: account-dashboard

## MODIFIED Requirements

### Requirement: Executive Cockpit Operational Workbench
The dashboard SHALL provide a responsive operational workbench at `/` featuring desktop 3-column layout, compact mobile presentation with a 2x2 KPI grid, a Quick Cash institution liquidity bar leading directly into recent mutations, and a persistent sticky bottom navigation bar on mobile viewports (< 768px).

#### Scenario: Scan Daily Financial Cockpit
- **WHEN** user loads the home cockpit route `/`
- **THEN** user can view their entire cash position, recent transaction activity, and critical runway alerts on one screen without opening nested modals or drawers.

#### Scenario: Filter Recent Mutations by Date Range on Cockpit
- **WHEN** user changes the date range preset (e.g. to "Bulan Ini" or "Bulan Depan") in the Cockpit workbench
- **THEN** the recent mutations feed filters dynamically to transactions within that date range.

#### Scenario: Mobile Viewport 2x2 KPI Grid and Quick Cash Bar Hierarchy
- **WHEN** user accesses `/` on a mobile viewport (< 768px)
- **THEN** the top KPI strip renders as a compact 2x2 grid displaying all 4 core indicators above the fold, followed by a streamlined single-row Quick Cash bar with a direct link to `/accounts`, leading immediately into the Recent Mutations feed.

#### Scenario: Sticky Bottom Navigation Bar on Mobile
- **WHEN** user navigates through any studio on a mobile viewport (< 768px)
- **THEN** a fixed bottom navigation bar is anchored in the thumb zone providing one-tap navigation between Cockpit, Ledger, Akun & Bank, and Perencanaan, while topbar navigation links remain hidden.
