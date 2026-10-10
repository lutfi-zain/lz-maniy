## Purpose

The studio landing page serves as the public flagship website for `membran.app`, presenting Membran as an independent software studio and applied AI lab. It establishes brand authority, presents the flagship product Maniy, and provides verified founder background to boost startup eligibility and personal portfolio credibility.

## ADDED Requirements

### Requirement: Architectural Hero Presentation
The landing page MUST present an imposing editorial header and studio manifesto upon arrival, establishing Membran's identity as a high-agency software atelier.

#### Scenario: First Viewport Render
- **WHEN** a visitor navigates to `https://membran.app`
- **THEN** the page displays the monogram `MEMBRAN`, the status beacon, and the core statement "An Independent Software Atelier" without generic AI marketing buzzwords or visual layout shift.

### Requirement: Selected Work Showcase
The landing page MUST present Maniy as a premier production artifact rather than a generic SaaS utility card.

#### Scenario: Inspecting Flagship Artifact
- **WHEN** the visitor views the Selected Works section
- **THEN** Maniy is displayed with full-bleed cinematic framing, production status badge (`Live Production v2`), stack architecture notes, and a direct outbound link targeting `https://maniy.membran.app`.

### Requirement: Atelier Ethos & Founder Dossier
The landing page MUST feature a verified founder profile and studio background to validate startup legitimacy for accelerator programs and professional inquiries.

#### Scenario: Founder Credentials Verification
- **WHEN** an evaluator or visitor reviews the Atelier & Leadership section
- **THEN** the dossier displays Lutfi Zain as Founder & Systems Architect, operational location in Tangerang/Jakarta, Indonesia, and verified outbound links to GitHub (`@lutfidmz`), LinkedIn, and email (`lutfi@membran.app`).

### Requirement: Live Telemetry & Technical Foundations
The landing page MUST visibly link to live observability infrastructure and articulate deterministic engineering principles.

#### Scenario: Accessing System Telemetry
- **WHEN** the visitor selects the telemetry beacon or observability link
- **THEN** the system navigates to `https://phoenix.membran.app` with `rel="noopener"` and target `_blank`.

### Requirement: Motion Choreography & Accessibility Compliance
The page MUST support smooth entrance micro-interactions while strictly respecting accessibility standards and reduced motion preferences.

#### Scenario: Reduced Motion Preference Enabled
- **WHEN** the visitor's operating system requests `prefers-reduced-motion: reduce`
- **THEN** all CSS transition delays, translateY shifts, and fade-up animations are deactivated, displaying fully visible static elements immediately.

#### Scenario: Keyboard Only Navigation
- **WHEN** a user navigates the page using the `Tab` and `Shift+Tab` keys
- **THEN** every interactive link and button displays a clearly visible focus ring with a contrast ratio of at least 4.5:1 against the dark background.
