# Proposal

## Why
Currently, the Maniyy V2 frontend retrieves entity data (Goals, Budgets, Wallets, Transactions) almost exclusively from a monolithic `GET /api/v1/account-detail` snapshot in memory. This introduces three critical shortcomings:
1. **Omitted & Incomplete Fields**: Rich fields already supported and persisted by the Reedrich Edge API—such as `goalNotes`, `targetDate`, `pacing` metrics (`requiredDailySavings`, `requiredMonthlySavings`), and budget period ranges—are completely omitted from the detail drawers and cards.
2. **Blind In-Memory Editing (Stale State Risk)**: Clicking the edit (pencil) icon populates form fields synchronously from memory cached at page-load time without querying dedicated `GET .../{id}` endpoints, causing potential data collisions and preventing deep-linking.
3. **No Temporal Lifecycle Handling**: Goals whose target dates have passed and Budgets from expired months remain visually undifferentiated and mixed into active feeds without status filtering or overdue indicators.
4. **Design System Violations**: The UI currently lacks the `.serif` class definition in CSS, retains heavy drop shadows (`shadow-xl`/`shadow-lg`) prohibited by `minimalist-ui`, and uses emojis for category icons.

Now is the optimal time to decouple entity details, introduce temporal lifecycle states, and achieve 100% `minimalist-ui` compliance.

## What Changes
- **Decoupled Entity Detail Fetching**: Implement dedicated `fetchGoalById`, `fetchBudgetById`, `fetchWalletById`, and `fetchTransactionById` in `reedrichStore` querying Reedrich `GET .../{id}` endpoints.
- **Hydration Before Edit / View**: When opening a drawer detail or form, hydrate the entity with the freshest data from the server, backed by an elegant skeleton loading state.
- **Full Field Exposure in Drawers**:
  - `GoalDrawerContent`: Render Target Notes (`notes`), Target Date (`targetDate`), and Pacing Metrics (`requiredDailySavings`, `requiredMonthlySavings`, `daysRemaining`).
  - `BudgetDrawerContent`: Render active period range dates, category tag, and notes.
  - `WalletDrawerContent`: Render latest transaction breakdown and account classifications.
  - `TransactionDetailView`: Render recurring template origins, planned vs realized timestamps, and occurrence dates.
- **Entity Lifecycle & Temporal Status Management**:
  - **Goals**: Visual indicators and filtering for `in_progress`, `overdue` (target date passed without reaching 100%), and `completed` (100% reached).
  - **Budgets**: Temporal filtering distinguishing between `active` (current month / active period) and `past` (expired / historical periods).
- **Design System Polish (`minimalist-ui`)**:
  - Define `.serif` typographic utility in CSS with `'Newsreader', 'Playfair Display', 'Instrument Serif', Georgia, serif`, tracking `-0.025em`, and line-height `1.15`.
  - Refine drawer, popover, combobox, and modal shadows from `shadow-xl`/`shadow-lg` to ultra-diffuse minimalist shadows (`border border-[#EAEAEA]` + `0 4px 24px rgba(0,0,0,0.03)`).
  - Replace category emoji defaults with crisp monochromatic Phosphor icon SVG primitives.

## Capabilities

### New Capabilities
- `entity-lifecycle`: Manages status classifications (in-progress, overdue, completed, expired periods), temporal status tracking, and segmented filtering for goals and budgets.

### Modified Capabilities
- `financial-store`: Adds standalone list fetchers and individual `fetch*ById` detail fetchers, eliminating exclusive dependence on `GET /api/v1/account-detail`.
- `drilldown-drawer`: Expands detail drawer contents to render complete entity fields (notes, pacing, temporal ranges) with pre-edit server hydration and skeleton loading.
- `planning-studio`: Implements smart status tabs and lifecycle badge differentiators across Goals and Budgets views.

## Impact
- **Non-breaking**: Existing snapshot loading via `account-detail` continues to power the Cockpit dashboard macro summary; standalone and detail endpoints enrich individual workspaces and drawers.
- **Shared Package**: Updates `@maniyy/shared` contracts and types to ensure all DTOs encompass `notes`, `targetDate`, `pacing`, and recurrence metadata.
- **Dependencies**: No new external dependencies required; utilizes existing Svelte 5 runes, Tailwind CSS v4, and Phosphor icons.
