# Spec Delta: financial-store

## Purpose
Manages reactive frontend state using Svelte 5 runes ($state, $derived), providing normalized caching for Reedrich API endpoints, resilient offline fallback, multi-currency formatting, and on-demand transaction retrieval.

## ADDED Requirements

### Requirement: Unified Account Detail Synchronization
The store SHALL fetch and normalize the atomic financial snapshot from `GET /api/v1/account-detail` into typed reactive state structures.

#### Scenario: Successful Live Snapshot Load
- **WHEN** a valid API key or Bearer token is provided and the network is online
- **THEN** the store populates netWorth, spendable/locked wallets, monthly cashflow, budgets, goals, and obligations from the live API response.

#### Scenario: Offline Mock Fallback
- **WHEN** network requests fail or the user toggles mock mode
- **THEN** the store loads the bundled mock snapshot, sets connection status to `MOCK / OFFLINE`, and prevents unhandled promise rejections.

### Requirement: Multi-Currency & Locale Formatting
The store SHALL provide deterministic formatting utilities for IDR (Indonesian Rupiah) and foreign currencies (e.g., USDT).

#### Scenario: Format Indonesian Rupiah
- **WHEN** formatting an IDR amount such as `12500000`
- **THEN** the output string is `Rp 12.500.000`.

#### Scenario: Format USDT Cryptocurrency
- **WHEN** formatting a USDT balance such as `115.61`
- **THEN** the output string is `115,61 USDT`.

### Requirement: On-Demand Entity Transaction Querying
The store SHALL provide a method to query transactions filtered by `walletId`, `categoryId`, or `budgetId`, caching results per entity to avoid redundant network round-trips.

#### Scenario: Query Transactions by Wallet ID
- **WHEN** `fetchWalletTransactions(walletId)` is invoked
- **THEN** transactions matching that wallet ID are fetched, cached in memory, and delivered to the calling component.
