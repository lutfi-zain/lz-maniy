## MODIFIED Requirements

### Requirement: Server-Driven Wallet Queries with Point-in-Time Parameters
The financial store MUST support parameterized queries for user wallets through `fetchWallets({ startDate, endDate, filter })` targeting `GET /api/v1/wallets`. When the backend returns point-in-time calculation payloads (`snapshot`), the store MUST map the wallet's `balance` to `snapshot.totalBalance` (including realized and planned transactions up to the specified boundary) before falling back to the current live `walletBalance`.

#### Scenario: Querying wallets with date bounds
- **WHEN** `fetchWallets` is called with `startDate` and `endDate` options
- **THEN** the request to `GET /api/v1/wallets` MUST append `startDate=${startDate}&endDate=${endDate}`
- **AND** for each returned wallet having a `snapshot.totalBalance`, the resulting `WalletItem.balance` MUST be assigned to that `snapshot.totalBalance`
- **AND** the returned wallet array MUST populate `reedrichStore.activeWallets` and `reedrichStore.allWallets`.

#### Scenario: Querying wallets without date bounds preserves live balance
- **WHEN** `fetchWallets()` is called with no temporal query parameters
- **THEN** `WalletItem.balance` MUST default to `w.walletBalance` or `w.balance`
- **AND** the store reflects current live operational balances.

#### Scenario: Querying wallets with future planned periods
- **WHEN** `fetchWallets` is called with date bounds in a future horizon (e.g. Next Month)
- **THEN** the extracted `WalletItem.balance` reflects the projected closing balance incorporating planned income and expenses returned in `snapshot.totalBalance`.
