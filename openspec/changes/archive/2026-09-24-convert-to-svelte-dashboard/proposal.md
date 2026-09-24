# Proposal: Convert Financial Dashboard to Svelte 5 & shadcn-svelte

## Why

The existing dashboard prototype is a single monolithic `index.html` file. While functional, it lacks modularity, type safety, test automation, and robust state management. Converting to Svelte 5 (Runes) with SvelteKit, TypeScript, `shadcn-svelte` (`bits-ui`), and Tailwind CSS enables a production-grade frontend architecture. This modernization provides automated unit and end-to-end testing, responsive design for desktop and mobile, and maintainable component separation while strictly preserving the editorial minimalism of `minimalist-ui` and the craft standards of `impeccable`.

## What Changes

- **Scaffold & Build Setup**: Initialize a SvelteKit project (SPA / adapter-static) configured with Bun, TypeScript, Tailwind CSS, and Prettier/ESLint/svelte-check.
- **Component Primitives**: Install and configure `shadcn-svelte` (`bits-ui`) with custom `minimalist-ui` theme tokens (warm monochrome `#F7F6F3`, 1px `#EAEAEA` borders, no heavy drop shadows, no pill-shaped large containers).
- **Iconography**: Integrate `phosphor-svelte` (Bold and Fill weights) for technical, consistent icons without emojis or generic Lucide line icons.
- **Reactive State Layer**: Implement a Svelte 5 runes-based state module (`reedrich.svelte.ts`) that manages active snapshots from `GET /api/v1/account-detail`, reactive filter parameters, offline mock caching, and lazy transaction fetching.
- **Component Architecture**: Decompose the dashboard into focused, reusable components:
  - `Topbar`: Brand, API connection status dot, token input, currency badge.
  - `BentoKpiGrid`: Consolidated net worth, spendable cash, locked cash, net savings.
  - `WalletSection`: Tabbed and partitioned wallet list (Spendable vs Locked, grouped by institution).
  - `CashflowSection`: Monthly income/expense summary and interactive 20-category expense breakdown bars.
  - `BudgetSection`: Active budgets with spending utilization progress.
  - `GoalSection`: Savings goals with derived multi-wallet linked breakdown tables.
  - `ObligationSection`: Active debt obligations and loan receivables with due dates.
  - `DrilldownDrawer`: Accessible slide-over sheet triggered by clicking any item (wallet, category, budget, goal, obligation) with lazy-loaded transaction tables and filter search.
- **Testing Suites**:
  - Unit tests with Vitest for financial formatters (IDR, USDT), currency conversions, institution grouping, and data mappers.
  - End-to-end tests with Playwright verifying dashboard rendering, tab switching, drilldown drawer opening and transaction loading, and mobile viewport responsiveness.

## Capabilities

### New Capabilities

- `account-dashboard`: Consolidated financial overview displaying net worth, spendable vs locked cash, monthly cashflow, budgets, goals, and obligations derived from `GET /api/v1/account-detail`.
- `drilldown-drawer`: Interactive slide-over drawer displaying granular metadata and lazy-fetched transactions for clicked wallets, categories, budgets, goals, and obligations.
- `financial-store`: Svelte 5 runes-based state store handling Reedrich API edge requests, reactive filters, mock fallback, and multi-currency formatting.

### Modified Capabilities

None (new greenfield capability specifications for the project).

## Impact

- **Codebase Structure**: Transitions from single-file `index.html` to standard SvelteKit layout in `src/`.
- **Developer Workflow**: Adds `bun run dev`, `bun run build`, `bun run check`, `bun test`, and `bunx playwright test`.
- **Runtime Dependencies**: Adds Svelte 5, `@sveltejs/kit`, `bits-ui`, `clsx`, `tailwind-merge`, `phosphor-svelte`.
- **Dev Dependencies**: Adds Vitest, Playwright, Tailwind CSS, TypeScript.
