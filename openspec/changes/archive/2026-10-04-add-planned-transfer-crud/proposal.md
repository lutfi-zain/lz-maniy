# Proposal

## Why

Currently, planned forecasting (`isPlanned: true`) is supported for income and expense transactions, but the UI explicitly restricts the "Rencana (Belum Terealisasi)" checkbox when the transaction type is set to `transfer`. Furthermore, the `CreateTransferPayload` type in `@maniyy/shared` lacks the `isPlanned` property. Users forecasting forward cashflow and intra-wallet liquidity (such as planned future transfers between checking accounts and savings pockets) cannot create planned transfers without immediately modifying live wallet balances. Because the Reedrich backend already supports `isPlanned` on `POST /api/v1/transfers` (leaving balances untouched when `isPlanned: true`), the frontend contracts and form controls must be updated to support planned transfer creation and status editing.

## What Changes

- Add optional `isPlanned?: boolean` field to `CreateTransferPayload` interface in `packages/shared/src/account-detail.ts`.
- In `TransactionFormDrawer.svelte`, remove the `{#if transactionType !== 'transfer'}` restriction so the "Rencana (Belum Terealisasi)" toggle is available across all three transaction types (expense, income, and transfer).
- In `TransactionFormDrawer.svelte` (`handleSubmit`), include `isPlanned: transactionFormStore.isPlanned` when dispatching `reedrichStore.createTransfer(payload)`.
- Allow toggling `isPlanned` between true and false in edit mode for existing transfer transactions, triggering backend atomic balance reconciliation upon realization.
- Add unit tests in `apps/web/src/lib/stores/transaction-form.test.ts` and `apps/web/src/lib/stores/reedrich-crud.test.ts` verifying planned transfer payload construction and form state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transaction-crud`: Extend transaction creation and editing flows to allow setting and toggling `isPlanned` (planned vs. realized) for fund transfers between wallets.

## Non-Goals

- Modifying the Reedrich backend runtime (the backend already supports `isPlanned` on `POST /api/v1/transfers` and `PATCH /api/v1/transactions/{id}`).
- Altering the recurring templates engine (recurring templates already produce planned occurrences).
- Multi-currency currency conversion logic in transfers.
