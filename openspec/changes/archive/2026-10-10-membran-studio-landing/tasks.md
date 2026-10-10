## 1. Workspace Scaffolding & Setup

- [x] 1.1 Scaffold `apps/studio` package with SvelteKit, TypeScript, Bun, and `@sveltejs/adapter-static` configured in `svelte.config.js`.
- [x] 1.2 Configure Tailwind v4 tokens, import Google Fonts (`Geist Sans` & `JetBrains Mono`), and define studio design tokens in `apps/studio/src/app.css`.
- [x] 1.3 Configure root `+layout.ts` with `export const prerender = true;` and establish full SEO meta tags, OpenGraph, and canonical links in `+layout.svelte`.

## 2. Core Studio Components & Editorial Content

- [x] 2.1 Implement `StudioHeader.svelte` with architectural monogram `[M] MEMBRAN`, live telemetry beacon linking to `phoenix.membran.app`, and index navigation.
- [x] 2.2 Implement `StudioHero.svelte` featuring statement display typography ("An Independent Software Atelier") and studio manifesto text.
- [x] 2.3 Implement `StudioShowcase.svelte` displaying Selected Work (Maniy) with cinematic card presentation, production status tag, stack metadata, and outbound link to `https://maniy.membran.app`.
- [x] 2.4 Implement `StudioDossier.svelte` featuring the Atelier & Leadership section with verified Founder Dossier for Lutfi Zain (Systems Architect & Software Engineer) including GitHub (`@lutfidmz`), LinkedIn, and direct contact.
- [x] 2.5 Implement `StudioFoundations.svelte` presenting the three technical pillars: Zero-Hallucination Math Integrity, Open Distributed Tracing, and Edge Velocity.
- [x] 2.6 Implement `StudioFooter.svelte` with geographical coordinates (Tangerang / Jakarta, Indonesia), time zone (WIB / UTC+07), and direct contact links.

## 3. Motion Choreography & Micro-Interactions

- [x] 3.1 Implement staggered viewport entrance animations (`@keyframes fadeUp`) using CSS custom properties and cubic-bezier easing.
- [x] 3.2 Implement interactive hover physics on the showcase card, link arrows, and telemetry beacon.
- [x] 3.3 Implement comprehensive `@media (prefers-reduced-motion: reduce)` overrides to instantly display static content for users requesting reduced motion.

## 4. Verification & Quality Gates

- [x] 4.1 Execute static build verification via `bun run --cwd apps/studio build` to ensure 100% pre-rendered HTML generation in `build/`.
- [x] 4.2 Verify accessibility compliance (WCAG AA 4.5:1 contrast, logical keyboard Tab/Enter navigation, visible focus indicators).
- [x] 4.3 Run pre-commit secret scan (`bun scripts/check-secrets.ts`) and ensure zero credentials or hardcoded secrets.
