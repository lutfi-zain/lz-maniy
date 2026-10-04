## Context

See `proposal.md` for motivation. On `/ledger`, inspecting the current calendar month (e.g. October 2026) currently shows two conflicting presentations:
1. `HorizonBoard.svelte` receives `srvPeriod.netWorth.total` from `GET /api/v1/analytics/horizon` (which calculates the projected roll-forward balance on the last day of the month, Oct 31st), but labels it `"NET WORTH SAAT INI"`. Meanwhile, the List View displays `snapshot.netWorth.consolidated.total` (live real-time balance on Oct 4th) under the same `"NET WORTH SAAT INI"` label.
2. In the List View, `aggregateStats` computes income, expense, and net cashflow strictly by summing `serverTransactions` (the current page, limited to 50 items). When a user has more than 50 transactions in the month, transactions on page 2+ are omitted from the summary strip, creating cashflow discrepancies against the full-month Horizon Board projection.

## Goals / Non-Goals

**Goals:**
- Disambiguate Horizon Board labeling: When `periodKey === currYearMonth`, label the net worth metric as `"PROYEKSI AKHIR BULAN"` (Indonesian) / `"Month-End Projection"` (English) so users immediately understand it represents the closing projection after planned cashflow rather than live balance today.
- Ensure full-period cashflow accuracy in List View: When viewing a full calendar month without narrowing sub-filters (wallet, category, budget, keyword), bind cashflow metrics (`Masuk`, `Keluar`, `Net Terfilter`) to authoritative full-period totals (from `horizonAnchorData?.periods` or full-window query), preventing page-1 pagination truncation.
- Preserve sub-filter cashflow responsiveness: When narrowing filters are applied and `serverTotalCount > serverTransactions.length`, ensure aggregates compute over all matching transactions in the window (querying up to 500 records or indicating total scope).
- Maintain 100% backward compatibility with existing tests and `/accounts` / `/planning` routes.

**Non-Goals:**
- Changing Cloudflare Workers backend APIs (the edge already precomputes `srvPeriod.cashflow` and `srvPeriod.netWorth`).
- Modifying Cockpit, Planning, or Accounts pages.

## Decisions

### 1. Horizon Board Present-Month Labeling

In `apps/web/src/lib/components/ledger/HorizonBoard.svelte`:
```ts
const currYearMonth = new Date().toISOString().slice(0, 7);
let label: 'PROYEKSI NET WORTH' | 'PROYEKSI AKHIR BULAN' | 'NET WORTH PENUTUPAN' = 'PROYEKSI AKHIR BULAN';
if (periodKey > currYearMonth) {
    label = 'PROYEKSI NET WORTH';
} else if (periodKey < currYearMonth) {
    label = 'NET WORTH PENUTUPAN';
} else {
    label = 'PROYEKSI AKHIR BULAN';
}
```
In `apps/web/src/lib/components/ledger/PeriodSummaryCard.svelte`:
Render `summary.label` dynamically with appropriate localization (`PROYEKSI AKHIR BULAN` / `PROYEKSI NET WORTH` / `NET WORTH PENUTUPAN`).

### 2. Full-Window Cashflow Resolution in List View

In `apps/web/src/routes/ledger/+page.svelte`:
Fetch `horizonAnchorData` not only for future/past months, but also for the current month when the date filter covers the calendar month:
```ts
const hasNarrowingFilters = $derived(
    selectedWalletIds.length > 0 ||
    selectedCategoryIds.length > 0 ||
    selectedBudgetIds.length > 0 ||
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    Boolean(searchKeyword.trim())
);

const aggregateStats = $derived.by(() => {
    // If no narrowing sub-filters are active and we have server horizon cashflow for this month:
    const srvPeriod = horizonAnchorData?.periods.find((p) => p.periodKey === endYearMonth);
    if (!hasNarrowingFilters && srvPeriod && dateFilterStore.preset === 'this_month') {
        return {
            count: serverTotalCount,
            income: srvPeriod.cashflow.income,
            expense: srvPeriod.cashflow.expense,
            net: srvPeriod.cashflow.net
        };
    }

    // Otherwise compute from filtered transactions
    let inSum = 0;
    let outSum = 0;
    for (const t of filteredTransactions) {
        const curr = getWalletCurrency(t.transactionWalletId);
        const amtIDR = getConvertedBalanceInIDR(t.transactionAmount, curr);
        if (t.transactionType === 'income') inSum += amtIDR;
        else if (t.transactionType === 'expense') outSum += amtIDR;
    }
    return {
        count: serverTotalCount || filteredTransactions.length,
        income: inSum,
        expense: outSum,
        net: inSum - outSum
    };
});
```

When narrowing filters are active and `serverTotalCount > serverTransactions.length`, perform a lightweight aggregate query (`limit: 200` or `500`) to guarantee full-window cashflow integrity.

### 3. Clear Right-Zone Anchor Subtext

In `routes/ledger/+page.svelte`:
For `NET WORTH SAAT INI`:
- `subtext`: `posisi kas riil hari ini (live snapshot)` in Indonesian / `live liquid balance today` in English.
For `PROYEKSI NET WORTH` / `PROYEKSI AKHIR BULAN`:
- `subtext`: `proyeksi per ${dFmt(endClean)} (pasca seluruh rencana)`.

## Test Strategy

1. **Unit Testing (Vitest)**:
   - `PeriodSummaryCard.test.ts` / `HorizonBoard.test.ts`: Verify that the current month period column generates the label `PROYEKSI AKHIR BULAN` while past periods generate `NET WORTH PENUTUPAN` and future periods generate `PROYEKSI NET WORTH`.
   - `ledger-cashflow.test.ts`: Test that when transactions exceed page 1 (50 items), the cashflow summary reflects full-period figures.
2. **Type Checking**:
   - `bun run check:web` to ensure zero type regressions.
3. **Secret Scanning**:
   - `bun scripts/check-secrets.ts`.
