# Design

## Context

See `proposal.md` for motivation. Currently:
- `HorizonPeriodColumn.svelte` hardcodes `limit: 50` and renders a manual button `Muat Lebih Banyak` at the end of an inner scroll container (`h-[320px] overflow-y-auto`).
- `PeriodSummaryCard.svelte` receives `income`, `expense`, and `net` overridden by `localCashflow`, which sums only the loaded transaction slice in memory, truncating true monthly cashflow.
- `AddPeriodCard.svelte` offers only month/year steppers (`YYYY-MM`), despite Reedrich API v1.17.0 natively accepting 2D date interval arrays `periods=[["startDate","endDate"],...]` for roll-forward projections.

## Goals / Non-Goals

**Goals:**
- Provide zero-click smooth infinite scroll inside each horizon column via `IntersectionObserver`.
- Ensure `PeriodSummaryCard` displays 100% accurate, immutable server cashflow figures (`srvPeriod.cashflow`) that never jump or truncate when scrolling through transactions.
- Support arbitrary custom date intervals (e.g. `2026-09-25` to `2026-10-24`) alongside whole calendar months (`YYYY-MM`) in the Horizon Board.
- Provide clean header formatting and maximization for custom date interval columns.

**Non-Goals:**
- Virtualized list rendering (unnecessary for the typical 50–300 items per column; simple DOM appending is fast and preserves native scroll inertia).
- Changing List view date presets (custom date ranges in List view already work via DateRangePicker).

## Decisions

### D1: Auto Infinite Scroll with IntersectionObserver Sentinel

**Decision**: Place a lightweight sentinel `<div bind:this={sentinelEl}>` at the bottom of the scroll container in `HorizonPeriodColumn.svelte`. Attach an `IntersectionObserver` scoped to the column container (`root: scrollContainerEl`).

```svelte
<!-- Scrollable list -->
<div bind:this={scrollContainerEl} class="h-[320px] divide-y divide-[#EAEAEA] overflow-y-auto text-xs">
    {#each periodTransactions as t (t.transactionId)}
        <!-- Row Item -->
    {/each}

    {#if hasNext}
        <div bind:this={sentinelEl} class="p-2.5 text-center font-mono text-[10px] text-[#787774]">
            {isLoadingMore ? (i18nStore.locale === 'id' ? 'Memuat transaksi...' : 'Loading more...') : ''}
        </div>
    {/if}
</div>
```

**Observer Lifecycle**:
- Root: `scrollContainerEl`.
- Root margin: `"100px"` (triggers fetch 100px before reaching the exact bottom for seamless feel).
- Threshold: `0.1`.
- Guard: `if (entry.isIntersecting && hasNext && !isLoadingMore) loadMore();`.
- Clean teardown on component unmount or when `hasNext === false`.

### D2: Decoupled Immutable Server Cashflow in `PeriodSummaryCard`

**Decision**: Remove `localCashflow` overriding from `HorizonPeriodColumn.svelte`. Pass `periodSummary` directly:

```svelte
<PeriodSummaryCard summary={periodSummary} />
```

**Rationale**:
- `periodSummary` in `HorizonBoard.svelte` already sources `income`, `expense`, and `net` from `srvPeriod.cashflow`, which the Reedrich server computes over the complete set of transactions in that period.
- The summary card displays the true economic picture immediately on card mount and never flickers or jumps when transactions are paged.
- An informative transaction counter in the column header (`Menampilkan X dari Y transaksi`) informs the user of scroll progress.

### D3: Universal Period Key Parser & Normalizer

**Decision**: Support two period key patterns throughout the app:
1. Month: `YYYY-MM` (e.g., `2026-10`)
2. Custom Interval: `YYYY-MM-DD_YYYY-MM-DD` (e.g., `2026-09-25_2026-10-24`)

Replace `getMonthDateBounds()` with `getPeriodDateBounds()` in `apps/web/src/lib/utils/dates.ts`:

```typescript
export function getPeriodDateBounds(periodKey: string): { startDate: string; endDate: string } {
    if (periodKey.includes('_')) {
        const [startDate, endDate] = periodKey.split('_');
        return { startDate, endDate };
    }
    const [yStr, mStr] = periodKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const startDate = `${periodKey}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${periodKey}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
}
```

### D4: Localized Period Header Formatter

**Decision**: Add `formatPeriodTitle(periodKey: string, locale: Locale): string` to `dates.ts`:
- If `periodKey.includes('_')`: parse start & end, format as localized range (e.g., `"25 Sep – 24 Okt 2026"`).
- Else: use `mLabel(periodKey, locale)` (e.g., `"Oktober 2026"`).

### D5: Query Serialization in `fetchHorizonProjections`

**Decision**: Update `reedrichStore.fetchHorizonProjections(periods)` in `apps/web/src/lib/stores/reedrich.svelte.ts`:
If any period in `periods` contains `_` (a date interval), convert all periods to 2D arrays `[[start, end], ...]`:
```typescript
const isIntervalMode = periods.some(p => p.includes('_'));
if (isIntervalMode) {
    const intervals = periods.map(p => {
        const { startDate, endDate } = getPeriodDateBounds(p);
        return [startDate, endDate];
    });
    queryParts.push(`periods=${encodeURIComponent(JSON.stringify(intervals))}`);
} else {
    queryParts.push(`periods=${encodeURIComponent(periods.join(','))}`);
}
```

### D6: AddPeriodCard Custom Date Range Selector

**Decision**: Add a tabbed interface inside `AddPeriodCard.svelte`:
- **Tab 1: Bulan Kalender** (Month/Year selector — existing behavior).
- **Tab 2: Rentang Tanggal Kustom** (Two date inputs `start` and `end`).
- Clicking `Tambah Periode` validates that `start <= end`, constructs `${start}_${end}`, and calls `settingsStore.addPeriod(periodKey)`.

## Test Strategy

### Unit Tests (`vitest`)
- `dates.test.ts`: Verify `getPeriodDateBounds` with canonical `YYYY-MM` and custom `YYYY-MM-DD_YYYY-MM-DD`.
- `dates.test.ts`: Verify `formatPeriodTitle` produces `"25 Sep – 24 Okt 2026"` for intervals and `"Oktober 2026"` for months.
- `reedrich.test.ts`: Verify `fetchHorizonProjections` serializes 2D JSON array when interval periods are present.

### E2E Tests (`playwright`)
- `multi-horizon-board.spec.ts`: Verify that scrolling to the bottom of a horizon column loads subsequent transactions automatically without clicking.
- `multi-horizon-board.spec.ts`: Verify that adding a custom period (`2026-09-25_2026-10-24`) renders a column with the formatted date range title and queries the server successfully.

## Risks / Trade-offs

| Risk | Mitigation |
| :--- | :--- |
| Too many rapid auto-scroll fetches if user scrolls quickly | Sentinel observer has a concurrency guard (`!isLoadingMore`) and standard 10-request concurrency pool protection |
| Custom interval periods breaking sorting of `activePeriods` | Compare periods by their `startDate` using `getPeriodDateBounds(a).startDate.localeCompare(getPeriodDateBounds(b).startDate)` |
| Mobile view compatibility | Horizon Board is desktop-only (`>=1024px`); mobile always renders List view |
