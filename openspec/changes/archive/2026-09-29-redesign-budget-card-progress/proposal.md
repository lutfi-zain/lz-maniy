# Proposal

## Why

The current `BudgetCard` displays only realized spending and total allowance limit (`Terpakai {p}% ({spent})` and `Batas Pagu {amount}`), forcing users to mentally calculate how much nominal headroom remains before exhausting their budget. In everyday financial budgeting, the primary decision-making figure is the remaining spendable allowance ("headroom"), not just the historical progress percentage. Furthermore, when spending exceeds 100%, the card fails to articulate the exact overrun amount and its visual bar does not communicate state urgency according to our design standards.

Redesigning the budget card progress section addresses these gaps by:
1. Elevating the remaining nominal headroom ("Sisa Menuju Batas" / "Remaining Allowance") into a prominent, immediate visual data point.
2. Explicitly communicating overrun amounts when over budget (e.g. `Melebihi batas Rp 250.000` / `Over by Rp 250,000`).
3. Adopting a state-aware progress bar with color-scarcity rules (`#111111` for safe, `#D97706` for warning >=80%, `#9F2F2D` for over budget >=100%).
4. Maintaining full English and Indonesian internationalization (`i18nStore`) consistency and strict adherence to the *Impeccable* product design guidelines.

## What Changes

- **Enhance Budget Progress Layout**: Redesign the progress area in `BudgetCard.svelte` using a high-density, editorial dual-metric layout:
  - Top row: Spent percentage with state badge.
  - Progress bar: Color-coded by utilization state (`#111111`, `#D97706`, `#9F2F2D`).
  - Metric row beneath the bar:
    - Primary left column: Remaining allowance to 100% (e.g. `Rp 1.300.000 lagi` / `Rp 1,300,000 remaining`) or Overrun amount (e.g. `Melebihi Rp 250.000` / `Over by Rp 250,000`).
    - Secondary right column: Realized spending / total limit ratio (`Rp 3.700.000 / Rp 5.000.000`).
- **Update i18n Localization Dictionaries**:
  - Add explicit translation keys for headroom and overrun formatting under `planning.budgets`:
    - `remainingToLimit`: `"Sisa {amount} lagi"` / `"{amount} remaining"`
    - `overLimitBy`: `"Melebihi batas {amount}"` / `"Over limit by {amount}"`
    - `headroomLabel`: `"Sisa Pagu"` / `"Remaining Headroom"`
    - `utilizationRatio`: `"Realisasi / Batas"` / `"Spent / Allowance"`
- **Improve Card Header Alignment**: Ensure category name and period context display cleanly without clutter.
- **Unit & Component Testing**: Add unit test coverage in `apps/web/src/lib/components/budgets/__tests__/BudgetCard.test.ts` to verify headroom calculation, over-budget handling, and locale formatting.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `planning-studio`: Refine the `Active Spending Budgets Workspace` requirement and `Display Budget Utilization Bar` scenario to mandate explicit nominal headroom calculation, overrun representation, and state-aware progress styling.

## Impact

- **Frontend Component**: `apps/web/src/lib/components/budgets/BudgetCard.svelte`.
- **Localization Files**: `apps/web/src/lib/i18n/locales/en.ts` and `apps/web/src/lib/i18n/locales/id.ts`, `apps/web/src/lib/i18n/types.ts`.
- **Tests**: Add `BudgetCard.test.ts` to Vitest suite.
- **Breaking Changes**: None. Backwards-compatible UI polish.
