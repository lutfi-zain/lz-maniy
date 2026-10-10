## Context

The current login route (`apps/web/src/routes/login/+page.svelte`) implements Google OAuth 2.0 PKCE authentication via Reedrich Edge, with a manual developer API key fallback. The interface is currently a single centered card on a `#F7F6F3` background, which fails to showcase the product's identity or provide guest evaluation access.

## Goals / Non-Goals

**Goals:**
- Implement an Asymmetric Editorial Split-Screen layout (55% left editorial / 45% right access terminal) on desktop viewports (>= 1024px).
- Showcase the Maniy value proposition on the left panel: Newsreader serif typography, a miniature visual Cockpit card (Spendable vs Locked metrics), and studio attribution to Membran (`membran.app`).
- Implement a 1-Click Demo Sandbox trigger allowing immediate exploration of the dashboard and Eve AI agent with zero registration friction.
- Ensure seamless mobile reflow (< 1024px) where the left panel condenses into a compact top hero and the access terminal fills the screen.
- Maintain 100% compatibility with existing Playwright test suites (`apps/web/tests/auth-flow.spec.ts`).

**Non-Goals:**
- No changes to backend OAuth 2.0 endpoints or Cloudflare Worker authentication logic.
- No permanent database changes for guest demo sessions (all guest interactions use local mock state).

## Decisions

### 1. Split-Screen Layout Architecture
- Desktop (`lg` breakpoint >= 1024px): Two-column asymmetric layout:
  - Left Panel (`lg:w-[55%]`): Warm Bone canvas (`bg-[#F7F6F3]`), generous padding (`p-12 xl:p-16`), displaying the editorial hook, miniature cockpit preview card, and studio link.
  - Right Panel (`lg:w-[45%]`): Pure White surface (`bg-white lg:border-l border-[#EAEAEA]`), centered container for authentication actions.
- Mobile (< 1024px): Single fluid vertical flow: the editorial headline sits above the authentication card, ensuring fast access without excessive scrolling.

### 2. Instant 1-Click Demo Sandbox Handler
A dedicated handler function `loginAsGuestDemo` will be added to `apps/web/src/routes/login/+page.svelte`:
```typescript
function loginAsGuestDemo() {
    isLoading = true;
    authStore.setSession(
        {
            access_token: 'sandbox_evaluator_token',
            expires_in: 86400 * 30
        },
        {
            email: 'evaluator@anthropic.com',
            name: 'Anthropic Evaluator',
            userId: 'usr_guest_evaluator'
        }
    );
    reedrichStore.loadMock();
    const target = sessionStorage.getItem('reedrich_auth_target') || '/';
    sessionStorage.removeItem('reedrich_auth_target');
    goto(target);
}
```
This ensures zero network latency, bypasses external Google redirects, and populates all 10 core tables with realistic data.

### 3. Visual Styling & Design System Tokens
Strictly adhering to `minimalist-ui`:
- **Canvas / Surface**: Warm Bone `#F7F6F3` on the left, Pure White `#FFFFFF` on the right.
- **Borders**: Hairline `1px solid #EAEAEA`.
- **Typography**:
  - Main Heading & Hook: `font-serif` (Newsreader / Editorial Serif), 32px tracking `-0.02em`.
  - Body & Labels: `font-sans` (Geist Sans), 13px line-height 1.5.
  - Numeric Displays: `font-mono` (JetBrains Mono).
- **Iconography**: Phosphor icons (`phosphor-svelte`) with `Bold` weight: `LockKey`, `Play`, `ArrowRight`, `ShieldCheck`.
- **Buttons**:
  - Google Sign-In: Solid `#111111` background, `#FFFFFF` text, `min-h-[44px]`.
  - Demo Sandbox: Border `1px solid #111111`, `#111111` text, hover `#F9F9F8`, `min-h-[44px]`.
  - Developer Mode: Discreet toggle button with chevron and progressive disclosure accordion.

### 4. Test Strategy
Update `apps/web/tests/auth-flow.spec.ts`:
- Preserve existing selectors: `h1.font-serif`, `button:has-text("Lanjutkan dengan Google")`, `button:has-text("masuk dengan api key")`.
- Add test case verifying that clicking "Explore Demo Sandbox" immediately navigates to `/` and renders the Executive Cockpit with spendable/locked metrics.

## Risks / Trade-offs

- **Test Assertion Breakage**: Existing tests check `page.locator('h1').toContainText('Maniy Workspace')`. *Mitigation*: Ensure the main heading or subhead in the terminal card retains `Maniy Workspace` so existing assertion matches reliably.
- **Accidental State Leakage**: Guest demo token interfering with real user API keys. *Mitigation*: The guest token is marked explicitly as `sandbox_evaluator_token` and `reedrichStore.loadMock()` operates entirely in-memory.
