## Why

The current login screen (`apps/web/src/routes/login/+page.svelte`) is a single floating card that fails to communicate Maniy's core value proposition to new visitors and forces startup evaluators (such as Claude for Startups curators) to authenticate with personal Google credentials. 

To maximize conversion and evaluator approval, the login surface must be redesigned into an Asymmetric Editorial Split-Screen layout matching Maniy's `minimalist-ui` design system and `impeccable` craft standards. Crucially, it must introduce an instant 1-Click Demo Sandbox mode, enabling anyone to explore the live Executive Cockpit and Eve AI agent with rich realistic data in under 2 seconds without registration friction.

## What Changes

- Transform `apps/web/src/routes/login/+page.svelte` into an Asymmetric Editorial Split-Screen layout:
  - **Left Editorial Panel (55% width on desktop)**: Features the Warm Bone canvas (`#F7F6F3`), Newsreader editorial serif typography, a miniature visual Cockpit card demonstrating Spendable vs Locked cash partitioning, and studio attribution to Membran (`membran.app`).
  - **Right Access Terminal (45% width on desktop)**: Pure White card surface (`#FFFFFF`) with 1px border (`#EAEAEA`), Google PKCE OAuth button, and progressive disclosure for developer API keys.
- Add **1-Click Demo Sandbox Mode**: A prominent secondary action button ("Explore Demo Sandbox") that immediately hydrates guest credentials via `authStore.setSession()` and triggers `reedrichStore.loadMock()`, instantly routing the evaluator to the dashboard with zero latency.
- Ensure strict compliance with mobile responsiveness (`antislop-layoutmobile`), collapsing the split-screen into a fluid single-column layout on viewports below 1024px.
- Maintain full compatibility with existing end-to-end authentication tests (`apps/web/tests/auth-flow.spec.ts`).

## Capabilities

### New Capabilities
*None.*

### Modified Capabilities
- `auth-session`: Extends login gateway behavior to support 1-Click Guest Sandbox session initialization and updates the visual interface to an editorial split-screen.

## Impact

- **Frontend User Journey**: First-time visitors and evaluators can experience the full cockpit immediately without registration.
- **Brand Consistency**: Aligns the gatekeeper route with Maniy's established design tokens (`minimalist-ui`, Phosphor icons, zero em-dashes, editorial serif headers).
- **Tests**: Preserves all existing Playwright auth flows and adds assertions for the 1-Click Demo trigger.
