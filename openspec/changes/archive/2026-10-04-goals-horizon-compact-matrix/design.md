## Context

See `proposal.md` for motivation. In the current implementation, `GoalsHorizonBoard.svelte` renders a multi-column card grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3...`) which requires massive vertical scrolling when viewing multiple periods with several goals. Furthermore, `routes/planning/+page.svelte` explicitly suppresses Horizon Board on mobile devices using `!isMobile` and CSS `hidden lg:inline-flex`.

To deliver an executive, ultra-compact financial overview, the Horizon view will be refactored into a unified **Horizon Matrix Table** across all screen sizes.

## Goals / Non-Goals

**Goals:**
- Pivot the existing `periodData` projection structure into goal-centric rows (`matrixRows`) with period columns.
- Render an ultra-compact table (~44px row height) with sticky frozen first column (`sticky left-0 bg-white border-r border-[#EAEAEA]`) showing Goal Name and Target Amount.
- Present clean 2-line cells without bulky progress bars or linked wallet breakdowns (Line 1: percentage / milestone `✓ 100%` / overdue `⚠️ Overdue`; Line 2: accumulated balance in IDR).
- Enable Horizon view on all viewports (mobile, tablet, desktop, and Android desktop-mode 980px viewports) by removing `hidden lg:` and `!isMobile` constraints.
- Retain interactive row-click to open `GoalDrawerContent`.
- Document this design as the blueprint for upcoming matrix tables in `/accounts` and `/ledger`.

**Non-Goals:**
- Changing the standard List card view (retains existing point-in-time date filtering and highest amount sorting).
- Refactoring `/accounts` or `/ledger` Horizon boards in this change (scoped as future phases).

## Decisions

### 1. Data Pivoting in `GoalsHorizonBoard.svelte`

Rather than altering the server projection fetcher `reedrichStore.fetchHorizonProjections()`, pivot `periodData` reactively:

```ts
interface MatrixCell {
    periodKey: string;
    periodTitle: string;
    startDate: string;
    endDate: string;
    currentAmount: number;
    progressPercentage: number;
    isReached: boolean;
    isMilestone: boolean;
    isOverdue: boolean;
    monthlyPacing: number | null;
}

interface MatrixRow {
    goal: GoalSnapshot;
    cells: MatrixCell[];
}

const matrixRows = $derived.by(() => {
    return activeGoals.map((g) => {
        const cells: MatrixCell[] = periodData.map((col) => {
            const item = col.goals.find((cg) => cg.goal.goalId === g.goalId);
            return {
                periodKey: col.periodKey,
                periodTitle: col.periodTitle,
                startDate: col.startDate,
                endDate: col.endDate,
                currentAmount: item?.currentAmount ?? g.currentAmount,
                progressPercentage: item?.progressPercentage ?? 0,
                isReached: item?.isReached ?? false,
                isMilestone: item?.isMilestone ?? false,
                isOverdue: item?.isOverdue ?? false,
                monthlyPacing: item?.monthlyPacing ?? null
            };
        });
        return { goal: g, cells };
    });
});
```

*Rationale*: Zero backend contract changes; leverages already edge-computed point-in-time wallet balances from `periodData`.

### 2. Table Layout & Sticky Column Architecture

The table will be wrapped in a horizontally scrollable container with minimal styling adhering to `minimalist-ui`:

- **Container**: `overflow-x-auto rounded-lg border border-[#EAEAEA] bg-white shadow-2xs`
- **Frozen Header / Column 1**:
  - `sticky left-0 bg-white z-20 border-r border-[#EAEAEA] px-4 py-3 min-w-[220px] sm:min-w-[260px]`
  - Renders `g.goalName` (semi-bold `text-xs text-[#111111]`) and Target Amount (`text-[11px] font-mono text-[#787774]`).
- **Period Columns**:
  - `min-w-[140px] sm:min-w-[160px] px-3.5 py-2.5 text-right`
  - Column headers include period title, goal count, "Maksimalkan ke List" button, and delete period button.
  - Period cells display Line 1 (status/percent) and Line 2 (accumulated balance tabular IDR).

### 3. Universal Device Accessibility

In `apps/web/src/routes/planning/+page.svelte`:
1. Remove `!isMobile` from the Horizon rendering condition:
   ```svelte
   {#if goalsViewMode === 'horizon'}
       <GoalsHorizonBoard />
   {:else}
       <!-- List view cards -->
   {/if}
   ```
2. Update the switcher wrapper:
   ```svelte
   <div class="inline-flex items-center rounded border border-[#EAEAEA] bg-[#F9F9F8] p-0.5">
   ```
   (Removes `hidden lg:` so the switcher renders across all mobile and desktop screen sizes).

### 4. Roadmap to Accounts & Ledger Horizon Boards

This matrix table architecture establishes the standard for:
1. `/accounts` Horizon Matrix: Rows = User Wallets, Columns = Periods, Values = Point-in-time closing balance + period delta.
2. `/ledger` Horizon Matrix: Rows = Categories / Cashflow streams, Columns = Periods, Values = In/Out aggregate net flow.

## Test Strategy

1. **Unit & Component Testing (Vitest)**:
   - Verify `matrixRows` correctly computes cells across ordered periods.
   - Verify status resolution (reached, overdue, in-progress) matches `periodData` calculations.
2. **Type Checking (svelte-check)**:
   - Full workspace type check to ensure zero TypeScript errors.
3. **Secret Hygiene**:
   - `check-secrets.ts` to confirm no operational tokens are leaked.

## Risks / Trade-offs

- **Small Screen Width (< 360px)**: Frozen column width is constrained to `200px-240px` with horizontal scroll indicator so users can smoothly pan through future periods.
