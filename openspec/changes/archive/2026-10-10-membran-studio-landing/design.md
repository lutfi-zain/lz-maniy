## Context

The repository is a Bun monorepo hosting `@maniyy/web` (in `apps/web`), `@maniyy/agent` (in `apps/agent`), and `@maniyy/shared` (in `packages/shared`). The primary app Maniy is deployed to `maniy.membran.app`. 

To host the studio identity at apex `membran.app`, a dedicated static site package `apps/studio` will be established in the workspace. It will leverage SvelteKit static prerendering (`@sveltejs/adapter-static`) for deployment to Cloudflare Pages without runtime Worker costs.

## Goals / Non-Goals

**Goals:**
- Provide an ultra-lightweight, 100% pre-rendered static website with sub-10ms initial HTML delivery.
- Implement an Awwwards-grade Radical Editorial aesthetic inspired by Studio Freight and Metalab.
- Showcase Maniy as a premier production artifact with rich contextual metadata.
- Present a verified Founder Dossier for Lutfi Zain to satisfy startup accelerator eligibility and personal portfolio linkage.
- Deliver refined motion choreography (staggered entrance, hover elevation, subtle telemetry beacons) with strict adherence to WCAG accessibility and `prefers-reduced-motion`.

**Non-Goals:**
- No dynamic server-side rendering or database queries in `apps/studio`.
- No interactive financial calculators or widgets on the studio landing page (those reside inside the Maniy application itself).
- No CMS integration; studio content is strictly version-controlled within the codebase.

## Decisions

### 1. Workspace Architecture & Deployment
- **Package**: `apps/studio` (`@maniyy/studio`).
- **Adapter**: `@sveltejs/adapter-static` with `prerender = true` in root `+layout.ts`.
- **Cloudflare Pages Configuration**: Root directory set to `apps/studio`, build command `bun run build`, output directory `build`.
- *Alternative Considered*: Astro with Svelte integration. *Rejected* to avoid introducing a second framework and bundler configuration into the monorepo.

### 2. Visual Identity & Design System Tokens
Following `antislop-ui` and `ui-ux-pro-max` (Exaggerated Minimalism & Dark Editorial):
- **Canvas / Background**: `#0A0D12` (Obsidian Void).
- **Surface / Card**: `#121721` (Deep Slate Card).
- **Architectural Borders**: `1px solid #1E2638` with `:hover` shift to `#334155`.
- **Telemetry Accent**: `#10B981` (Emerald Signal).
- **Typography Stack**:
  - Display & Headings: `Geist Sans`, tracking `-0.03em`.
  - Technical Data & Metadata: `JetBrains Mono`.
- **Anti-Slop Strict Enforcement**:
  - Zero em-dashes across all written prose.
  - Zero fake terminal windows with simulated typed commands.
  - Zero pill badges floating above H1 headings.
  - Zero fabricated user metrics or customer logos.

### 3. Component Hierarchy
```
apps/studio/src/
├── routes/
│   ├── +layout.svelte         // Fonts, global CSS, SEO metadata
│   ├── +layout.ts             // prerender = true
│   └── +page.svelte           // Master assembly page
└── lib/
    ├── components/
    │   ├── StudioHeader.svelte      // Monogram, live telemetry beacon, nav links
    │   ├── StudioHero.svelte        // Statement typography, studio manifesto
    │   ├── StudioShowcase.svelte    // Selected works (Maniy cinematic card)
    │   ├── StudioDossier.svelte     // Atelier background & Lutfi Zain profile
    │   ├── StudioFoundations.svelte // 3 Technical principles (Math, Tracing, Edge)
    │   └── StudioFooter.svelte      // Coordinates, copyright, and direct email
    └── styles/
        └── studio.css               // Tailwind v4 and custom token variables
```

### 4. Motion Design & Micro-Interactions
- **Entrance Animation**: CSS `@keyframes fadeUp` with custom timing curve `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Header: delay 0ms, duration 500ms.
  - Hero Manifesto: delay 100ms, duration 600ms.
  - Selected Works: delay 250ms, duration 700ms.
  - Founder Dossier & Foundations: delay 400ms, duration 800ms.
- **Card Micro-Interactions**:
  - Cinematic showcase card features smooth border illumination on hover (`#1E2638` to `#334155`, 200ms ease).
  - Outbound link arrow shifts 2px diagonally on hover (`translate(2px, -2px)`).
- **Telemetry Beacon**:
  - Live emerald beacon with subtle single-ring ping animation (`scale(1.8)`, `opacity: 0`, 2s loop).
- **Accessibility Safety**:
  - Wrapped inside `@media (prefers-reduced-motion: reduce)` which sets animation to `none` and renders all elements at full opacity immediately.

## Risks / Trade-offs

- **Build Pipeline Isolation**: Monorepo build commands must correctly isolate `apps/studio` dependencies without bundling heavy backend packages. *Mitigation*: Specify clean workspace dependencies in `apps/studio/package.json`.
- **SEO & Canonical Routing**: Ensuring `membran.app` properly serves canonical tags while redirecting `www.membran.app`. *Mitigation*: Hardcode production canonical `<link rel="canonical" href="https://membran.app">` in the root layout.
