## 1. Login Page Layout Redesign

- [x] 1.1 Refactor `apps/web/src/routes/login/+page.svelte` to implement the Asymmetric 55/45 Editorial Split-Screen layout with Newsreader serif typography, Warm Bone `#F7F6F3` left canvas, and Pure White `#FFFFFF` right card surface.
- [x] 1.2 Implement the left editorial panel featuring the product thesis, miniature visual Cockpit card (Spendable vs Locked reserves metrics), and Membran Studio attribution link.
- [x] 1.3 Implement the 1-Click Demo Sandbox action button in the right access terminal and wire `loginAsGuestDemo()` to hydrate `authStore` and trigger `reedrichStore.loadMock()`.
- [x] 1.4 Refine developer mode progressive disclosure accordion for manual API key access with touch targets >= 44px.

## 2. Responsive Reflow & Mobile Adaptation

- [x] 2.1 Implement fluid single-column collapse for viewports under 1024px according to `antislop-layoutmobile`.
- [x] 2.2 Verify zero horizontal overflow, appropriate mobile padding, and 44x44px minimum touch targets on all buttons.

## 3. Testing & Verification

- [x] 3.1 Update `apps/web/tests/auth-flow.spec.ts` with assertions for the new 1-Click Demo Sandbox button and verify all existing tests pass (`bun run test:web`).
- [x] 3.2 Run full workspace type check (`bun run check:web`).
- [x] 3.3 Execute pre-commit secret hygiene scan (`bun scripts/check-secrets.ts`).
