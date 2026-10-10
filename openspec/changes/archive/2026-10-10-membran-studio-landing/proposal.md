## Why

Membran requires an authoritative, high-craft public web presence at `membran.app` to establish legitimacy as an independent software studio and applied AI lab. This site functions as the umbrella entity for flagship products like Maniy (`maniy.membran.app`), satisfies eligibility verification for programs such as Anthropic's Claude for Startups, and serves as an authentic portfolio backlink for founder Lutfi Zain. 

Generic SaaS layouts (with template bento boxes, fake widgets, and AI marketing clichés) fail to convey engineering rigor. The studio landing page must adopt a radical editorial aesthetic inspired by world-class studios (Studio Freight, Metalab), utilizing bold typography, purposeful motion, strict anti-slop rules, and a verified founder dossier.

## What Changes

- Scaffold and configure `apps/studio` in the monorepo as a lightweight SvelteKit application utilizing `@sveltejs/adapter-static` for static Cloudflare Pages hosting.
- Implement an Awwwards-caliber Radical Editorial & Studio Atelier visual system: deep obsidian background (`#0A0D12`), hairline architectural rules (`1px solid #1E2638`), high-contrast typography (Geist Sans + JetBrains Mono), and a single functional telemetry accent (`#10B981`).
- Design an imposing Hero Section featuring statement typography ("An Independent Software Atelier"), architectural viewport framing, and live OTLP telemetry status indicators.
- Create a Selected Work showcase for Maniy featuring full-bleed cinematic card presentation, live deployment badges, and interactive hover depth.
- Incorporate a Studio Ethos & Founder Dossier section detailing studio philosophy, Lutfi Zain's profile (Systems Architect & Software Engineer), geographic footprint (Jakarta/Tangerang, Indonesia), and verified links (GitHub `@lutfidmz`, LinkedIn, `lutfi@membran.app`).
- Add a Technical Foundations section highlighting deterministic relational math, open distributed tracing (`phoenix.membran.app`), and edge velocity.
- Implement tasteful motion choreography: staggered viewport entrance, interactive hover physics, and strict compliance with `prefers-reduced-motion`.

## Capabilities

### New Capabilities
- `studio-landing`: Public static studio flagship landing page for `membran.app` encompassing the studio manifesto, cinematic product showcase for Maniy, founder dossier, and live telemetry status.

### Modified Capabilities
*None. Existing web application capabilities for Maniy (`apps/web`) and agent services (`apps/agent`) remain unaffected.*

## Impact

- **Monorepo Architecture**: Introduces `apps/studio` with shared UI primitives and Tailwind v4 tokens, building directly to static HTML.
- **Hosting & Infrastructure**: Deploys via Cloudflare Pages targeting the apex domain `membran.app`.
- **Identity & Compliance**: Aligns with `antislop-ui`, `ui-ux-pro-max`, and `marketing-psychology` standards with zero em-dashes and no fabricated claims.
