# Tasks

## 1. Shared Types & Contracts

- [x] 1.1 Add `isPlanned?: boolean` to `CreateTransferPayload` interface in `packages/shared/src/account-detail.ts`. Verify: `bun run --cwd packages/shared check` passes.

## 2. Transaction Form Component

- [x] 2.1 In `apps/web/src/lib/components/transaction/TransactionFormDrawer.svelte`, remove the `{#if transactionType !== 'transfer'}` check wrapping the planned checkbox so the "Rencana (Belum Terealisasi)" toggle is visible and accessible for transfers. Verify: `bun run --cwd apps/web check` passes.
- [x] 2.2 In `TransactionFormDrawer.svelte` (`handleSubmit`), include `isPlanned: transactionFormStore.isPlanned` in the `CreateTransferPayload` when dispatching `reedrichStore.createTransfer(payload)`. Verify: `bun run --cwd apps/web check` passes.

## 3. Unit Tests

- [x] 3.1 In `apps/web/src/lib/stores/transaction-form.test.ts`, add test cases verifying that `isPlanned` can be toggled and preserved for transfer transactions in both create and edit modes. Verify: `bun run --cwd apps/web test` passes.
- [x] 3.2 In `apps/web/src/lib/stores/reedrich-crud.test.ts`, add test cases verifying that `reedrichStore.createTransfer` includes `isPlanned: true` in the POST request body and handles response reconciliation. Verify: `bun run --cwd apps/web test` passes.

## 4. Validation Suite

- [x] 4.1 Run full validation suite: `bun run --cwd packages/shared check`, `bun run --cwd apps/web check`, `bun run --cwd apps/web test`, and `bun run --cwd apps/web build`. All checks and tests must pass with 0 errors.
