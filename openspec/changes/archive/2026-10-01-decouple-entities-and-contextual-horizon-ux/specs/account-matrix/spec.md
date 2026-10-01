# Spec Delta: account-matrix

## ADDED Requirements

### Requirement: Standalone Wallet List Synchronization
The Bank & Accounts studio (`/accounts`) SHALL fetch wallet data directly from `reedrichStore.fetchWallets()` upon mounting and following any wallet mutation.

#### Scenario: On-Mount Direct Wallet Query
- **WHEN** user navigates to `/accounts`
- **THEN** `reedrichStore.fetchWallets()` is invoked
- **AND** wallet cards render with real-time `lastTransaction` details (date, amount, category, and direction)
- **AND** sorting by `last_tx` orders wallets accurately by their actual last mutation date.

### Requirement: Context-Aware Toolbar in Horizon View
The account matrix toolbar SHALL adapt to the active view mode, hiding redundant temporal pickers in multi-period views.

#### Scenario: Hide Date Range Picker in Horizon Mode
- **WHEN** view mode is set to `Horizon Board` on `/accounts`
- **THEN** the top `DateRangePicker` is hidden
- **AND** when view mode is switched back to `List`, the `DateRangePicker` is visible.

#### Scenario: Filtered Subtotals in Horizon Columns
- **WHEN** a search keyword or status filter is active on `/accounts` in Horizon Board mode
- **THEN** each period column calculates its subtotal metrics from the subset of wallets matching the filter criteria.
