# account-matrix Specification

## Purpose
Provides an institutional account and wallet management matrix at `/accounts` displaying wallets grouped hierarchically by bank or institution with automated subtotal balances, spendable versus locked partitioning, multi-currency support, and seamless drilldown to filtered ledger views.

## Requirements

### Requirement: Hierarchical Institution Grouping with Subtotals
The account matrix SHALL group all user wallets by financial institution (e.g., Bank Central Asia, Bank Jago, OCBC, GoPay, Bitget, General Cash) and automatically compute and display the aggregate balance subtotal for each institution.

#### Scenario: Display Bank Groups with Subtotals
- **WHEN** user views `/accounts`
- **THEN** each institution header displays the institution name, total number of accounts, and the consolidated balance subtotal (e.g., "BCA · 2 akun · Rp 8.975.931,69").

### Requirement: Granular Account Status & Currency Breakdown
Each wallet within an institution group SHALL display its account name, purpose, access status (Spendable vs Locked Reserve), account type (bank, e-wallet, crypto, cash), and balance in its native currency (IDR, USDT) alongside converted valuation.

#### Scenario: View Account Allocation
- **WHEN** inspecting accounts under "Bank Jago"
- **THEN** the user can distinguish between operational spendable pockets ("Main Wallet", "Vitamin Istri", "Bensin & Transport") and locked reserves ("Dokter Anak", "Sewa Rumah", "Taktis").

### Requirement: Direct Navigation to Filtered Ledger
Each wallet row SHALL provide a direct action button to view its transaction history.

#### Scenario: Navigate from Wallet to Ledger
- **WHEN** user clicks "Lihat Mutasi" on "BCA Main"
- **THEN** the application navigates to `/ledger?walletId=...`, pre-filtering the transaction ledger to that specific wallet.
