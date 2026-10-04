# Design

## Context

The Maniyy dashboard supports logging and planning financial movements across wallets. In `TransactionFormDrawer.svelte`, transactions can be created as either realized (immediate balance impact) or planned (`isPlanned: true`, non-balance impact forecast). However, line 456 of `TransactionFormDrawer.svelte` currently wraps the planned checkbox in `{#if transactionType !== 'transfer'}`, preventing users from setting planned transfers. Furthermore, the `CreateTransferPayload` TypeScript interface in `packages/shared/src/account-detail.ts` omits `isPlanned`.

Live testing confirms that the Reedrich backend (`POST /api/v1/transfers`) already accepts `isPlanned: boolean` and appropriately creates transfers with `transactionIsPlanned: 1` without touching wallet balances.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Provide parity for `isPlanned` across all transaction types (Expense, Income, and Transfer).
- Support creating planned transfers via `POST /api/v1/transfers` with `{ isPlanned: true }`.
- Support toggling `isPlanned` between true and false in edit mode (`PATCH /api/v1/transactions/{id}`), enabling realization of planned transfers.
- Verify through unit tests that `isPlanned` is correctly passed in payload construction and store actions.

**Non-Goals:**
- Backend engine changes (Reedrich Workers API already implements `isPlanned` logic in `transferFunds` and `updateTransaction`).
- Multi-currency conversion changes in transfers.

## Decisions

### 1. Update `CreateTransferPayload` in `@maniyy/shared`

**Decision**: Add `isPlanned?: boolean;` to `CreateTransferPayload` in `packages/shared/src/account-detail.ts`.

```ts
export interface CreateTransferPayload {
	sourceWalletId: string;
	targetWalletId: string;
	amount: number;
	adminFee?: number;
	description?: string | null;
	categoryId?: string | null;
	date?: string;
	transactionDate?: string;
	isPlanned?: boolean;
}
```

**Rationale**: Aligns the client contract with the Reedrich API runtime parameter schema (`TransferFundsParams`).

### 2. Universal Planned Checkbox in `TransactionFormDrawer.svelte`

**Decision**: Remove `{#if transactionType !== 'transfer'}` wrapping the planned checkbox container. The checkbox will render for all transaction types in both create and edit modes.

**Rationale**: A transfer can be planned just like an expense or income (e.g. scheduling a planned move of Rp 5.000.000 from BCA to a savings pocket at the end of the month).

### 3. Payload Construction in `handleSubmit`

**Decision**: In `TransactionFormDrawer.svelte`, update `payload` creation for `transactionType === 'transfer'`:

```ts
const payload: CreateTransferPayload = {
	sourceWalletId: transactionFormStore.walletId,
	targetWalletId: transactionFormStore.targetWalletId,
	amount: transactionFormStore.amount!,
	adminFee: transactionFormStore.adminFee || 0,
	description: transactionFormStore.description.trim() || null,
	date: transactionFormStore.date,
	isPlanned: transactionFormStore.isPlanned
};
```

In edit mode, `delta` already includes `isPlanned: transactionFormStore.isPlanned`, which maps directly to `PATCH /api/v1/transactions/{id}`.

### 4. Test Coverage Strategy

**Decision**:
- Add unit test in `transaction-form.test.ts` verifying that `transactionFormStore.isPlanned` can be set when `transactionType === 'transfer'`.
- Add unit test in `reedrich-crud.test.ts` verifying `reedrichStore.createTransfer` forwards `isPlanned: true` in the POST request body.

## Component Hierarchy & State Architecture

```
TransactionFormDrawer.svelte
  └── transactionFormStore ($state isPlanned)
        ├── setType('transfer') -> preserves isPlanned state
        └── handleSubmit() -> builds CreateTransferPayload { ..., isPlanned }
              └── reedrichStore.createTransfer(payload) -> POST /api/v1/transfers
```

## Risks / Trade-offs

- **Risk**: Point-in-time timeline calculations might double-count planned transfers.
  - **Mitigation**: Inspected `apps/web/src/lib/utils/networth-timeline.ts` (`calculatePointInTimeWalletBalances`). Line 283–302 adjusts future balances for planned transfers between cutoff dates, and line 311 explicitly ignores planned transactions (`t.transactionIsPlanned !== 1`) for historical cutoff calculations. The behavior is mathematically consistent.
