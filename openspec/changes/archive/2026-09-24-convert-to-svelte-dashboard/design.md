# Design: Svelte 5 & shadcn-svelte Dashboard Architecture

## Context

The current implementation is an operational single-file prototype (`index.html`) demonstrating live synchronization with the Reedrich Edge API (`GET /api/v1/account-detail`) and drilldown slide-over drawers. This design modernizes the architecture into a production Svelte 5 (SvelteKit SPA) application adhering to the `minimalist-ui` protocol and `impeccable` frontend craft standards.

See `proposal.md` for motivation and scope.

## Goals / Non-Goals

**Goals:**
- Architect a modular Svelte 5 application leveraging runes (`$state`, `$derived`, `$effect`) for state management.
- Implement an accessible slide-over drawer using `shadcn-svelte` / `bits-ui` (`Dialog` / `Sheet`) with smooth animations and keyboard control (`ESC`).
- Adhere strictly to the `minimalist-ui` visual language: Newsreader serif typography, JetBrains Mono numbers, warm monochrome `#F7F6F3` canvas, 1px `#EAEAEA` borders, spot pastel badges, zero emojis.
- Deliver comprehensive automated testing: Vitest for unit calculations and Playwright for interactive end-to-end flows.
- Provide fluid responsiveness across desktop (>= 1024px, 60/40 split) and mobile (< 1024px, stacked single-column with 100vw drawers).

**Non-Goals:**
- Server-Side Rendering (SSR) or database-backed Node server (the application is purely a client-side SPA communicating with the Cloudflare Workers API).
- Authentication login screen / session cookie management (the app connects via bearer/API token stored in local state).
- In-place mutation endpoints (creating transactions/wallets); the scope is planning, visualization, and forecasting intelligence.

## Decisions

### 1. SvelteKit SPA Mode with Static Adapter
- **Decision**: Configure `@sveltejs/adapter-static` with `ssr = false` in `src/routes/+layout.ts`.
- **Rationale**: The app functions as an offline-capable client dashboard querying edge worker endpoints. SPA mode avoids Node runtime overhead and deploys frictionlessly to Cloudflare Pages, Vercel, or static storage.

### 2. Svelte 5 State Architecture (`src/lib/stores/reedrich.svelte.ts`)
- **Decision**: Use a single state class or rune factory exporting reactive `$state` objects rather than legacy Svelte 4 writable stores.
```typescript
class ReedrichStore {
  snapshot = $state<AccountDetail | null>(null);
  categories = $state<Category[]>([]);
  activeDrawer = $state<DrawerState | null>(null);
  isLoading = $state(false);
  isLive = $state(false);
  activeTab = $state<'all' | 'spendable' | 'locked'>('all');
  selectedInstitution = $state<string | null>(null);
  
  spendableWallets = $derived(this.snapshot?.wallets.spendable.items ?? []);
  lockedWallets = $derived(this.snapshot?.wallets.locked.items ?? []);
  filteredWallets = $derived.by(() => {
    // computes activeTab + selectedInstitution filtering
  });
}
```
- **Rationale**: Runes provide fine-grained reactivity, eliminating boilerplate `.subscribe()` calls and enabling seamless derived calculations.

### 3. Component Hierarchy & Composition
```
src/
├── lib/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Topbar.svelte
│   │   │   └── AmbientBackground.svelte
│   │   ├── kpi/
│   │   │   ├── BentoKpiGrid.svelte
│   │   │   └── KpiCard.svelte
│   │   ├── wallets/
│   │   │   ├── WalletSection.svelte
│   │   │   └── WalletCard.svelte
│   │   ├── cashflow/
│   │   │   ├── CashflowSection.svelte
│   │   │   └── CategoryBar.svelte
│   │   ├── budgets/
│   │   │   ├── BudgetSection.svelte
│   │   │   └── BudgetCard.svelte
│   │   ├── goals/
│   │   │   ├── GoalSection.svelte
│   │   │   └── GoalCard.svelte
│   │   ├── obligations/
│   │   │   ├── ObligationSection.svelte
│   │   │   └── ObligationCard.svelte
│   │   └── drawer/
│   │       ├── DrilldownDrawer.svelte
│   │       ├── WalletDrawerContent.svelte
│   │       ├── CategoryDrawerContent.svelte
│   │       ├── GoalDrawerContent.svelte
│   │       └── DrawerTransactionTable.svelte
│   ├── stores/
│   │   └── reedrich.svelte.ts
│   ├── types/
│   │   └── account-detail.ts
│   └── utils/
│       ├── currency.ts
│       └── dates.ts
└── routes/
    ├── +layout.svelte
    ├── +layout.ts
    └── +page.svelte
```

### 4. Minimalist UI & Impeccable Styling Strategy
- Tailwind CSS configured with design tokens:
  - Font families: `font-serif` -> `Newsreader`, `font-mono` -> `JetBrains Mono`, `font-sans` -> `Geist Sans`, system-ui.
  - Colors: `--canvas` (`#F7F6F3`), `--surface` (`#FFFFFF`), `--border` (`#EAEAEA`), `--ink` (`#111111`), `--ink2` (`#2F3437`), `--muted` (`#787774`).
  - Spot pastels for tags: red (`#FDEBEC` / `#9F2F2D`), blue (`#E1F3FE` / `#1F6C9F`), green (`#EDF3EC` / `#346538`), yellow (`#FBF3DB` / `#956400`).
- Strict negative constraints:
  - `box-shadow` capped at `0 2px 8px rgba(0,0,0,0.04)`.
  - Border radius: maximum `12px` for panels, `8px` for cards, `6px` for buttons.
  - No large pill containers. Only small tags and badges receive `rounded-full`.
  - Text contrast verified $\ge 4.5:1$ across all states.

### 5. Automated Testing Strategy
- **Unit Tests (Vitest)**:
  - `currency.test.ts`: IDR formatting (`Rp 12.500.000`), USDT formatting, zero/negative handling.
  - `reedrich.test.ts`: Store initialization, mock snapshot loading, spendable vs locked partition counts, wallet filtering by tab and institution.
- **E2E Tests (Playwright)**:
  - `dashboard.spec.ts`: Verify KPI values render correctly (`Rp 17.333.190,67`), tabs filter wallets between 17, 11, and 6 items.
  - `drilldown.spec.ts`: Clicking a wallet card opens the slide-over drawer, loads transaction rows, and closes on `ESC` press.
  - `responsive.spec.ts`: Test mobile viewport (375x667) ensuring single-column stacking, touch target sizes $\ge 44\text{px}$, and 100vw drawer coverage.

## Risks / Trade-offs

- **Rate Limits & Edge Latency**: Multiple rapid wallet clicks could trigger repeated API calls for transactions.
  - *Mitigation*: In-memory cache in `reedrich.svelte.ts` keyed by `walletId` and `categoryId` with immediate response on subsequent opens.
- **Svelte 5 Runes Ecosystem Maturity**: Some community packages still target Svelte 4.
  - *Mitigation*: We use `bits-ui` next / `shadcn-svelte` modern release built specifically for Svelte 5, with standard TypeScript primitives.
