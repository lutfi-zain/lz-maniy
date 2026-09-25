# Proposal: Budget Filtering in Ledger & Cross-Studio Planning Drilldown

## Why

In the Planning Studio (`/planning`), users can monitor monthly budget progress bars, savings goal accumulators, and upcoming recurring liabilities, but cannot click on any item to view which specific transactions compose that budget or mutation schedule. While transactions in the Reedrich API schema carry `transactionBudgetId`, the Ledger Studio (`/ledger`) currently lacks a budget filter, URL parameter support (`?budgetId=...`), and visual budget tag resolution. Users need a direct drilldown path from every planning artifact into a pre-filtered transaction ledger.

## What Changes

1. **Budget Filter Engine in Ledger Studio (`/ledger`)**:
   - Parse `budgetId` and `budget` query parameters on initial URL load and retain the filter state.
   - Add a Searchable Multi-Select Budget Combobox in the Ledger filter bar alongside Wallets and Categories.
   - Filter `allTransactions` using `t.transactionBudgetId === selectedBudgetId` (or category fallback when budget is linked to specific category IDs).
   - Display a resolved budget badge in desktop and mobile transaction feeds when a transaction is assigned to a budget.
   - Display an active filter chip when filtered by budget, with an instant "x" clear button.

2. **Interactive Drilldown from Planning Studio (`/planning`)**:
   - **Pagu Anggaran (Budgets)**: Add a prominent "Lihat Transaksi →" action link on each budget card, redirecting to `/ledger?budgetId={b.budgetId}&budget={encodeURIComponent(b.budgetName)}`.
   - **Target Tabungan (Goals)**: Provide one-click links from linked funding wallets to `/ledger?walletId={w.walletId}` to review transfers and deposits contributing to that goal.
   - **Kewajiban & Rutin (Debts/Loans & Recurring Templates)**: Add "Mutasi Terkait →" links redirecting to `/ledger?search={encodeURIComponent(t.name)}` or filtered by the recurring source wallet, allowing users to inspect realized installments and history.

## Capabilities

### Modified Capabilities
- `ledger-studio`: Add budget combobox filter, `budgetId` URL parameter handling, transaction budget ID filtering, and budget badge display.
- `planning-studio`: Transform budget cards, goal wallets, and recurring template rows into interactive jump points linking directly to pre-filtered ledger views.

## Impact

- **User Experience**: Enables full circular discovery between forward-looking planning and granular realized ledger execution.
- **Performance**: Instant client-side filtering over in-memory transaction store without extra network latency.
- **Compatibility**: Fully backward-compatible; transactions without a budget ID remain visible when no budget filter is active.
