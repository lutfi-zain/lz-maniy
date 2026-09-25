# Design: CRUD Transaction Form

## Context

Maniyy V2 uses a single global `ReedrichStore` (Svelte 5 runes) that fetches read-only data from the Reedrich Edge API. The existing `DrilldownDrawer` slide-over (max-width 620px, right-aligned, z-50) is mounted per-page in route components and handles entity detail views (wallet, category, budget, goal, obligation). The `Topbar` provides desktop navigation; `BottomNav` provides 4-tab mobile navigation (Cockpit / Ledger / Akun / Planning). See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Introduce write operations (create, update, delete transaction; create transfer) through a single, globally accessible form drawer.
- Maintain the existing minimalist-ui editorial aesthetic — no new visual paradigm.
- Ensure post-mutation state consistency across all routes without manual refresh.

**Non-Goals:**
- Bulk transaction operations (multi-select delete, batch import).
- Offline optimistic writes (mutations require live API connectivity).
- Editing transfer transactions as transfers (the PATCH endpoint treats them as regular transactions; re-routing is a separate concern).

## Decisions

### 1. Global Transaction Form Drawer (Layout-Level Mount)

- **Decision**: Create a new `TransactionFormDrawer.svelte` component mounted in `src/routes/+layout.svelte`, controlled by a new `transactionFormStore` rune module. Separate from the existing `DrilldownDrawer` to avoid overloading its entity-type dispatch.
- **Rationale**: The existing `DrilldownDrawer` is entity-focused (wallet/category/budget/goal/obligation) with type-specific content components. Adding a form with create/edit/view modes, type switching, and validation state would create a god-component. A separate drawer component keeps responsibilities clean while sharing the same visual pattern (slide-over from right, 620px, backdrop blur, ESC dismiss).
- **Alternative Considered**: Extending `DrilldownDrawer` with `type: "transaction-form"` / `type: "transaction-detail"`. Rejected because the form has internal mode state (create vs edit vs view), validation state, and a fundamentally different interaction model from read-only entity drilldowns.

### 2. Transaction Form Store (`transactionFormStore`)

- **Decision**: Create `src/lib/stores/transaction-form.svelte.ts` as a lightweight rune module managing:
  ```typescript
  class TransactionFormStore {
    isOpen = $state(false);
    mode = $state<'create' | 'edit' | 'view'>('create');
    transactionType = $state<'expense' | 'income' | 'transfer'>('expense');
    existingTransaction = $state<TransactionRecord | null>(null);
    isSaving = $state(false);
    error = $state<string | null>(null);
    // Form field values
    walletId = $state('');
    targetWalletId = $state('');
    categoryId = $state('');
    budgetId = $state('');
    amount = $state<number | null>(null);
    adminFee = $state(0);
    description = $state('');
    date = $state('');
    isPlanned = $state(false);
  }
  ```
- **Rationale**: Separate from `reedrichStore` because form state is ephemeral UI state (discarded on close), while `reedrichStore` holds persistent data cache. This avoids polluting the data store with transient form state.

### 3. Type Switcher via Three-Button Toggle

- **Decision**: Use a three-button inline toggle (styled as the minimalist-ui `ToggleGroup` pattern) at the top of the form: `Pengeluaran` / `Pemasukan` / `Transfer`. Each button uses a `1px solid #EAEAEA` border when inactive, `bg-[#111111] text-white` when active.
- **Rationale**: Three options fit cleanly in one row. ToggleGroup is the shadcn-recommended pattern for 2-7 mutually exclusive options. No dropdown overhead for only 3 choices.
- **Conditional Field Visibility**: Fields animate in/out with a 150ms `opacity` + `max-height` transition when type changes. No accordion chrome — just smooth reveal.

### 4. BottomNav Center Action Button

- **Decision**: Insert a 5th element in the center of `BottomNav` between Ledger (position 2) and Akun (position 3). The center button is visually distinct: `bg-[#111111] text-white rounded-lg size-10` with a `Plus` phosphor icon, raised 4px above the nav bar baseline to break the tab rhythm and signal "action" vs "navigation".
- **Layout**: The BottomNav changes from `justify-around` (4 items) to a 5-item layout: `Cockpit | Ledger | [+] | Akun | Planning`. The center button does not have a label or active-page indicator.
- **Rationale**: Proven mobile pattern (banking apps, fintech). The visual break from navigation tabs communicates that this is a primary action, not a destination. No FAB needed.

### 5. Topbar `[+ Catat]` Button

- **Decision**: Add a button in `Topbar.svelte` between the Sync button and the Live/Mock status indicator: `border border-[#EAEAEA] bg-white px-2.5 py-1 text-xs font-medium text-[#111111]` with `Plus` phosphor icon. Hidden on mobile (`hidden md:flex`) since mobile uses the BottomNav center button.
- **Rationale**: Consistent with the existing Sync button's visual weight. Positioned near live data controls to associate "add data" with the data area.

### 6. Mutation Methods in ReedrichStore

- **Decision**: Add four methods directly to `ReedrichStore`:
  ```
  createTransaction(payload) -> TransactionRecord
  createTransfer(payload) -> TransactionRecord
  updateTransaction(id, delta) -> TransactionRecord
  deleteTransaction(id) -> void
  ```
  Each method uses the existing `this.request()` pipeline. On success, each calls `this.invalidateAndRefresh()` which: (1) clears `transactionCache`, (2) resets `allTransactions` to `[]` to force re-fetch, (3) calls `fetchSnapshot()`.
- **Rationale**: The `request()` pipeline already handles Bearer tokens, proactive refresh, and 401 retry. Mutation methods belong on the same store that manages the data they modify. Separate refresh after mutation ensures wallet balances, cashflow, and budget utilization stay consistent.
- **Alternative Considered**: Separate `transactionApi.ts` service module. Rejected because mutations need direct access to `transactionCache`, `allTransactions`, and `fetchSnapshot()` on the store instance.

### 7. View → Edit Mode Transition

- **Decision**: The detail view and edit form share the same drawer surface. In view mode, field values are rendered as static text with a `[Edit] [Hapus]` action bar at the bottom. Clicking `[Edit]` transitions to edit mode: static text fields become input/select/combobox controls pre-filled with current values. The header changes from the transaction description to "Edit Transaksi". A `[Simpan] [Batal]` action bar replaces the `[Edit] [Hapus]` bar.
- **Rationale**: Inline editing in the same drawer maintains spatial context. The user sees the same information surface transform, not a separate page or dialog. This is the Linear/Notion pattern.

### 8. Delete Confirmation

- **Decision**: Use a custom confirmation dialog (modal overlay, not browser `confirm()`): white card centered on screen, `border: 1px solid #EAEAEA`, max-width 400px. Shows transaction description, amount, and the warning "Saldo akun akan disesuaikan secara otomatis." Two buttons: `[Batal]` (secondary) and `[Hapus]` (destructive, `bg-[#9F2F2D] text-white`).
- **Rationale**: Browser `confirm()` blocks the thread and cannot be styled. A modal dialog with clear context (which transaction, what amount) reduces accidental deletion.

### 9. Form Field Components

| Field | Component | Notes |
|---|---|---|
| Wallet (source) | `<select>` native or `ComboboxMultiSelect` (single mode) | Grouped by institution. Shows wallet name + balance. |
| Wallet (target) | Same as source wallet | Only visible for transfers. Must exclude source wallet. |
| Category | `ComboboxMultiSelect` (single mode) | Filtered by type: expense categories for expense, income categories for income. |
| Amount | `<input type="text">` with currency prefix | Numeric input with `Rp` prefix. Formatted on blur. Raw number on focus. |
| Admin Fee | `<input type="text">` with currency prefix | Optional. Defaults to 0. |
| Date | Date input with `DateRangePicker` (single-date mode) or native `<input type="date">` | Defaults to today. |
| Description | `<textarea>` | Optional. Max 500 chars. |
| Planned | `<input type="checkbox">` | Hidden for transfers. Label: "Rencana (belum terealisasi)". |
| Budget | `<select>` or combobox | Only visible for expenses when budgets exist. |

### 10. Keyboard Shortcut `N`

- **Decision**: Listen on `svelte:window` in `+layout.svelte`. On `keydown` event where `e.key === 'N'` or `e.key === 'n'`, check `e.target` is not an input/textarea/contenteditable. If safe, open the transaction form in create mode. Does not fire when the form drawer is already open.
- **Rationale**: Single-key shortcuts (no modifier) are the Linear/Notion convention for primary actions. The guard prevents intercepting text entry.

## Risks / Trade-offs

- **Race Condition on Rapid Mutations**: User submits a create, then immediately tries to create another before `fetchSnapshot()` completes. Mitigation: the form store's `isSaving` flag disables the submit button during the save+refresh cycle.
- **Stale Category/Wallet Lists**: Categories and wallets are fetched once on app load and cached. If a user adds a wallet via external tool, the form won't see it until next sync. Acceptable for V1; future improvement could add a "refresh" affordance on the wallet picker.
- **Transfer Edit Limitation**: The Reedrich API `PATCH /api/v1/transactions/{id}` can modify transfer transaction fields, but cannot change `sourceWalletId`/`targetWalletId` atomically as the transfer endpoint does. The edit form for transfers allows editing amount, description, date, and admin fee but disables wallet pickers. This is a backend API limitation, not a frontend choice.
