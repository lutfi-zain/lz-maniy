# Tasks: Convert Financial Dashboard to Svelte 5 & shadcn-svelte

## 1. Project Scaffold & Tooling Setup

- [x] 1.1 Scaffold SvelteKit project with TypeScript, static adapter, and Bun as package manager
- [x] 1.2 Configure Tailwind CSS and design tokens adhering strictly to `minimalist-ui` (fonts, warm monochrome palette, spot pastels, 1px borders)
- [x] 1.3 Install `phosphor-svelte`, `clsx`, `tailwind-merge`, and configure `bits-ui` / `shadcn-svelte` primitives
- [x] 1.4 Setup Vitest for unit testing and Playwright for end-to-end testing with appropriate npm scripts

## 2. Types, Utils & Reactive State Layer

- [x] 2.1 Define strict TypeScript interfaces for Reedrich API models (`AccountDetail`, `Wallet`, `CashFlow`, `Budget`, `Goal`, `Obligation`, `Transaction`)
- [x] 2.2 Implement currency formatting (`fmtIDR`, `fmtCurrency`), date formatting utilities, and write Vitest unit tests in `src/lib/utils/currency.test.ts`
- [x] 2.3 Implement Svelte 5 runes-based state module `src/lib/stores/reedrich.svelte.ts` with API synchronization, mock cache fallback, and derived wallet filters
- [x] 2.4 Implement Vitest unit tests in `src/lib/stores/reedrich.test.ts` verifying state transitions, filtering, and mock fallback

## 3. Core Dashboard Component Architecture

- [x] 3.1 Implement `Topbar.svelte` component with brand logo, live connection status dot, token input, and base currency badge
- [x] 3.2 Implement `BentoKpiGrid.svelte` and `KpiCard.svelte` displaying consolidated net worth, spendable cash, locked cash, and monthly net savings
- [x] 3.3 Implement `WalletSection.svelte` and `WalletCard.svelte` with spendable/locked/all tabs, institution filtering, and last transaction badges
- [x] 3.4 Implement `CashflowSection.svelte` with monthly totals and interactive 20-category expense breakdown bars
- [x] 3.5 Implement `BudgetSection.svelte` with active budget cards, limit utilization bars, and status pills
- [x] 3.6 Implement `GoalSection.svelte` with derived multi-wallet linked breakdown tables and progress tracking
- [x] 3.7 Implement `ObligationSection.svelte` rendering active debt liabilities and loan receivables

## 4. Slide-Over Drilldown Drawer & Dynamic Views

- [x] 4.1 Implement `DrilldownDrawer.svelte` container using bits-ui dialog/sheet with slide animation, backdrop blur, and `ESC` key dismiss
- [x] 4.2 Implement `WalletDrawerContent.svelte` showing wallet metadata, balance, and lazy-fetched transaction list with search filtering
- [x] 4.3 Implement `CategoryDrawerContent.svelte` showing category spending metrics and transactions tagged with that category
- [x] 4.4 Implement `BudgetDrawerContent.svelte` showing budget limit, remaining balance, and related transactions
- [x] 4.5 Implement `GoalDrawerContent.svelte` showing multi-wallet contributions and conversion rates
- [x] 4.6 Implement `ObligationDrawerContent.svelte` showing debt/loan payoff details and due date status

## 5. Responsive Layout, Polish & Impeccable Shape Review

- [x] 5.1 Implement desktop 60/40 asymmetric workspace and mobile (<1024px) single-column responsive layout
- [x] 5.2 Verify color contrast ($\ge 4.5:1$), typography scale (`Newsreader`, `JetBrains Mono`), and touch targets ($\ge 44\text{px}$)
- [x] 5.3 Run `svelte-check` and linter to ensure 0 TypeScript or template errors

## 6. End-to-End Automated Testing & Quality Verification

- [x] 6.1 Create Playwright E2E test suite `tests/dashboard.spec.ts` testing initial render and KPI calculations
- [x] 6.2 Create Playwright E2E test suite `tests/drilldown.spec.ts` testing click-to-open drawer for wallets and categories
- [x] 6.3 Create Playwright E2E test suite `tests/responsive.spec.ts` verifying mobile viewports (375x667) and drawer interactions
- [x] 6.4 Execute full test suite (`bun test` and `bunx playwright test`) and verify all tests pass
