# Design

## Context

See `proposal.md` for motivation.

The application displays budget cards inside `/planning` under the `Budgets` sub-tab (`BudgetSection.svelte` rendering a responsive grid of `BudgetCard.svelte`).
Data originates from the backend `GET /api/v1/account-detail` endpoint, where each item in `snapshot.budgets` conforms to `BudgetSnapshot` (`amount`, `spent`, `remaining`, `percentUsed`, `status`).

Currently, `BudgetCard.svelte` uses:
- A fixed black progress bar fill (`bg-[#111111]`) regardless of health status.
- Single text row: `Terpakai {p}% ({fmtIDR(budget.spent)})` on the left and `Batas Pagu {fmtIDR(budget.amount)}` on the right.
- No headroom metric displaying the exact nominal amount remaining to 100%.

## Goals / Non-Goals

**Goals:**
- Present an editorial dual-metric layout that leads with actionable remaining headroom (`budget.amount - budget.spent`).
- Clearly communicate over-budget conditions with explicit overrun nominals (`Melebihi batas Rp X` / `Over limit by Rp X`).
- Introduce state-aware styling for the progress bar and status indicator adhering to our color scarcity rules (Safe: `#111111`, Warning [80-99%]: `#D97706`, Over [>=100%]: `#9F2F2D`).
- Ensure full internationalization support via `$lib/i18n` with zero hardcoded language strings.
- Add comprehensive Vitest unit test coverage for `BudgetCard.svelte`.

**Non-Goals:**
- Modifying backend APIs or database schemas (all needed properties are already in `BudgetSnapshot`).
- Changing budget drawer forms, budget deletion, or transaction linking flows.
- Modifying other planning cards (e.g. `GoalCard` or `ObligationCard`) in this change.

## Decisions

### 1. Dual-Row Metric Architecture

Instead of crowding all data into a single cramped row, we structure the progress section into two clear layers:

```
[Layer 1: Progress Indicator]
-------------------------------------------------------------
[========================================-------------]  74%
(h-2 rounded-full track with state-colored fill)

[Layer 2: Editorial Metric Grid]
-------------------------------------------------------------
Left Column (Headroom Lead)        Right Column (Context Ratio)
Sisa Menuju Batas                  Realisasi / Batas Pagu
Rp 1.300.000 lagi                  Rp 3.700.000 / Rp 5.000.000
(font-mono font-bold text-xs)      (font-mono text-[11px] text-[#787774])
```

**Over-Budget Condition (> 100%):**
```
[=====================================================] 115%
(Fill capped visually at 100% width with #9F2F2D crimson)

Melebihi Batas                     Realisasi / Batas Pagu
+Rp 750.000                        Rp 5.750.000 / Rp 5.000.000
(font-mono font-bold text-[#9F2F2D])
```

*Rationale*: Prioritizes what the user can still spend while keeping the full historical context immediately legible without cognitive strain.

### 2. Svelte 5 Runes State Derivation

In `BudgetCard.svelte`, derivations use Svelte 5 `$derived`:
```ts
const percent = $derived(budget.percentUsed || 0);
const rawRemaining = $derived(budget.amount - budget.spent);
const isOver = $derived(rawRemaining < 0);
const isWarning = $derived(percent >= 80 && percent < 100);

const barColorClass = $derived(
  isOver ? 'bg-[#9F2F2D]' : isWarning ? 'bg-[#D97706]' : 'bg-[#111111]'
);
```

### 3. Responsive Behavior

- **Desktop (>= 1024px)**: `BudgetSection.svelte` renders cards in a 2 or 3-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). Metrics sit comfortably on a single line with `justify-between`.
- **Mobile (< 1024px / < 640px)**: Grid collapses to `grid-cols-1`. The metric row utilizes `flex-wrap gap-1.5` so long nominals wrap gracefully without text clipping or horizontal overflow. Tabular figures (`tabular-nums`) prevent layout jitter.

### 4. Localization Keys Schema

Add new keys to `apps/web/src/lib/i18n/types.ts`, `en.ts`, and `id.ts`:
```ts
planning: {
  budgets: {
    // Existing keys...
    headroomLabel: string;
    overrunLabel: string;
    remainingToLimit: string;
    overLimitBy: string;
    spentRatio: string;
  }
}
```

## Risks / Trade-offs

- **Risk**: Very long budget names or extreme nominals (e.g. billions IDR) could cause text wrapping on narrow devices.
  - **Mitigation**: Use `truncate` on labels, compact currency formatting (`fmtIDR`), and `flex-wrap` containers.
- **Risk**: Existing `percentUsed` from API may be floating-point (e.g. `74.32%`).
  - **Mitigation**: Format with `Math.round(percent)` for the badge and clamp bar width with `Math.min(100, Math.max(0, percent))`.

## Test Strategy

1. **Unit Tests (Vitest)**:
   - Create `apps/web/src/lib/components/budgets/__tests__/BudgetCard.test.ts`.
   - Test safe budget (`spent < amount`): assert headroom rendered as "Sisa Rp X lagi", correct percentage, bar color.
   - Test warning budget (`80% <= percent < 100%`): assert amber styling.
   - Test over budget (`spent > amount`): assert crimson styling, "Melebihi batas Rp X".
   - Test drawer trigger on click.
2. **Quality Gates**:
   - `bun run --cwd apps/web test:unit`
   - `bun run --cwd apps/web check`
   - `bun run --cwd apps/web build`
