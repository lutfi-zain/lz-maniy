# Proposal

## Why

While the application adapts fluidly across screen widths via standard responsive wrappers, the mobile experience currently suffers from strong "desktop-first" artifacts: navigation is confined to an awkward top horizontal scroll strip out of the natural thumb zone, ledger transactions are trapped in an 8-column table requiring horizontal swiping to read transaction amounts, and mobile cockpit pages stack extensive multi-account lists that bury recent transaction activity under multiple screen heights of scrolling.

By implementing mobile-native utilitarian UX patterns—a sticky bottom navigation bar, dual-view dense transaction rows with zero horizontal scrolling, a compact 2x2 KPI summary grid, and an optimized mobile hierarchy (Quick Cash Bar leading directly into Recent Mutations)—the application achieves an effortless mobile cockpit experience while rigorously honoring our `minimalist-ui` design system (flat borders, warm bone canvas, pure white surfaces, and no gratuitous card nesting or drop shadows).

## What Changes

- **Sticky Bottom Navigation Bar (`BottomNav.svelte`)**:
  - Mounts a fixed bottom bar on mobile viewports (`< 768px`) housing 4 primary destinations in the natural thumb zone: `Cockpit` (Compass), `Ledger` (Table), `Akun & Bank` (Bank), and `Perencanaan` (Target).
  - Streamlines `Topbar.svelte` on mobile to display only the brand logo and connection/sync status, hiding redundant top navigation links.
  - Automatically hides the bottom navigation bar on tablet and desktop viewports (`md:` and above), preserving the standard topbar navigation.
- **Dual-Presentation Dense Transaction Rows (`/ledger` and `CockpitRecentLedger`)**:
  - On desktop (`md:` and above), retains the full multi-column spreadsheet table with tabular numeric alignment.
  - On mobile (`< 768px`), renders transactions as a flat, dense document-style feed (`divide-y divide-[#EAEAEA]`) with zero horizontal scrolling:
    - **Header Line**: Description (left, truncated font-medium) paired with Amount (right, font-mono font-bold tabular-nums, semantic green/black).
    - **Metadata Line**: Transaction Date · Category Tag · Source $\rightarrow$ Target Wallet.
- **Cockpit Mobile Information Architecture (Option A)**:
  - **Compact 2x2 KPI Grid**: Adapts top KPI tiles to a 2-column, 2-row layout on mobile (`grid-cols-2 lg:grid-cols-4`) so all 4 core liquidity indicators are visible above the fold.
  - **Quick Cash Bar**: On mobile, transforms the long bank accounts list into a compact single-row institution liquidity strip (`BCA Rp 8,9M · Jago Rp 4,8M · OCBC Rp 959rb`) with a clean link to `/accounts`.
  - **Immediate Recent Activity**: Places recent mutations directly below the Quick Cash Bar, allowing users to check recent spending instantly without scrolling past 15+ individual accounts.
- **Touch-Optimized Filters & Controls**:
  - Expands mobile search bars and DateRangePicker triggers to full width (`w-full`) with comfortable touch target heights ($\ge 40\text{px}$).

## Capabilities

### Modified Capabilities
- `account-dashboard`: Updates layout and navigation requirements to mandate the mobile sticky bottom navigation bar, 2x2 compact KPI grid, and mobile Quick Cash summary bar with immediate recent activity.
- `ledger-studio`: Updates table rendering requirements to mandate dual-presentation (desktop tabular grid vs mobile dense transaction rows with zero horizontal scrolling).

## Impact

- **User Experience**: Mobile users can effortlessly navigate between core studios with one hand, scan recent transactions without sideways scrolling, and view full financial health above the fold.
- **Components & Layout**: Adds `src/lib/components/layout/BottomNav.svelte`, updates `src/lib/components/layout/Topbar.svelte`, `src/routes/+layout.svelte`, `src/lib/components/cockpit/CockpitKpiStrip.svelte`, `src/lib/components/cockpit/CockpitBankWidget.svelte`, `src/lib/components/cockpit/CockpitRecentLedger.svelte`, and `src/routes/ledger/+page.svelte`.
- **Breaking Changes**: None. All existing desktop layouts, stores, URL parameters, and APIs remain 100% backward compatible.
