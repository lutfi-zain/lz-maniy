# Proposal

## Why

The current Ledger Studio (`/ledger`) displays transactions for a single date range at a time. Users cannot compare financial flows across months or simulate forward-looking scenarios ("if I add expense X this month, what is my net worth next month?", "if I save Z monthly, when do I reach goal Y?"). This forces manual recalculation and repeated date-filter switching to answer the most common financial planning questions. A multi-period view with cascading projections eliminates this friction.

## What Changes

- **New "Horizon Board" view mode** in `/ledger` alongside the existing single-period list view, toggled via a persistent switcher in the header.
- **Period columns rendered in a wrapping CSS Grid** (3–4 columns per row on desktop, wrapping to additional rows as periods are added). Each column contains a dense ledger table and a summary card.
- **Dense Ledger Table per period** supporting full transaction CRUD (add, edit, delete via existing `TransactionFormDrawer`) scoped to that period's date range.
- **Summary card per period** showing: cashflow (Masuk, Keluar, Net), point-in-time Net Worth (Spendable vs Locked), and snapshot goal progress.
- **Cascading financial projection engine** where closing Net Worth of period N becomes the opening balance for period N+1, automatically recalculating when any transaction is added/edited/deleted.
- **User-configurable period list** (default: current month + next 2 months). Users can add unlimited periods by selecting a start and end date, remove individual periods, and reorder them. Configuration persists across sessions and devices via a new `user_settings` table in D1 and `GET/PUT /api/settings` endpoints on the agent backend.
- **Responsive wrap layout**: on narrower viewports, period columns wrap to subsequent rows instead of horizontal scrolling.

## Capabilities

### New Capabilities
- `horizon-board`: Multi-period calendar board view mode within `/ledger`, cascading financial projections, configurable period list, and per-period dense ledger with summary cards.
- `user-settings`: Server-persisted user preferences (D1 table + API endpoints) for horizon board configuration and future extensibility (language, currency, start-of-month).

### Modified Capabilities
- `ledger-studio`: Adding view mode switcher (single list vs horizon board) to the Ledger Studio header. Existing single-period functionality unchanged.
- `agent-chat/backend`: Adding authenticated `/api/settings` GET/PUT endpoints to the Hono router. Existing chat and conversation routes unchanged.

## Non-Goals

- Recurring transaction template engine (auto-populating planned transactions into future periods).
- Inter-period drag-and-drop of transactions.
- Mobile-specific horizon board layout (mobile continues to use the existing single-period list view; the board is desktop-only, >= 1024px).
- Custom start-of-month date, language, or currency settings (structure prepared in `UserSettings` type but not implemented in this change).
