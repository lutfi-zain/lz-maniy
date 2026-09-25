# Tasks

## 1. Shell Navigation & Layout Structure

- [x] 1.1 Create `src/lib/components/layout/BottomNav.svelte` implementing sticky mobile navigation bar (< 768px) with 4 primary destinations (Cockpit, Ledger, Akun, Planning) and active state indicator
- [x] 1.2 Update `src/lib/components/layout/Topbar.svelte` to hide navigation links on mobile (`hidden md:flex`), preserving brand logo and connection indicator
- [x] 1.3 Update `src/routes/+layout.svelte` to mount `BottomNav.svelte` and apply mobile bottom padding (`pb-20 md:pb-6`) so content is never obscured

## 2. Dual-Presentation Dense Transaction Rows

- [x] 2.1 Refactor `src/routes/ledger/+page.svelte` to implement dual presentation: full spreadsheet table on desktop (`hidden md:table`) and flat dense document feed on mobile (`md:hidden divide-y divide-[#EAEAEA]`)
- [x] 2.2 Refactor `src/lib/components/cockpit/CockpitRecentLedger.svelte` to implement dual presentation: desktop table (`hidden md:table`) and mobile dense rows (`md:hidden divide-y divide-[#EAEAEA]`)
- [x] 2.3 Optimize mobile search bars and DateRangePicker triggers to full width with comfortable touch target heights (>= 40px)

## 3. Cockpit Mobile Hierarchy (Option A)

- [x] 3.1 Update `src/lib/components/cockpit/CockpitKpiStrip.svelte` to render a 2x2 compact grid on mobile (`grid-cols-2 lg:grid-cols-4`) with compact typography and padding
- [x] 3.2 Update `src/lib/components/cockpit/CockpitBankWidget.svelte` to render a sleek horizontal Quick Cash liquidity bar on mobile with direct link to `/accounts`
- [x] 3.3 Structure Cockpit workbench in `src/routes/+page.svelte` so mobile presentation displays Quick Cash Bar immediately followed by Recent Mutations feed

## 4. End-to-End Testing & Automated Quality Verification

- [x] 4.1 Create Playwright E2E test in `tests/mobile-ux.spec.ts` testing mobile viewport navigation, topbar link hiding on mobile, zero horizontal scroll in ledger, and Cockpit Option A hierarchy
- [x] 4.2 Execute full test suite (`bun run test:unit && bun run test:e2e`)
- [x] 4.3 Run type checker and linter (`bun run check && bun run lint`) and verify 0 errors and 0 warnings
- [x] 4.4 Build static production bundle (`bun run build`) and verify build artifacts
