## ADDED Requirements

### Requirement: 6-Tier Interactive Capabilities Grid
The studio landing page MUST present an interactive 6-card bento grid articulating Membran's core engineering disciplines: Deterministic Accounting, Evaluated AI Reasoning, High-Fidelity Systems, Global Edge Runtimes, Distributed Tracing, and Secure ACID Data Engines, with bespoke geometric visual artifacts and zero generic marketing buzzwords.

#### Scenario: Inspecting Capabilities Grid
- **WHEN** a visitor navigates to the capabilities section
- **THEN** all 6 distinct engineering pillars are displayed in a responsive grid, each containing an index marker (`01` through `06`), domain title, concise technical description, and bespoke geometric graphic representation.

### Requirement: Studio Manifesto Presentation
The studio landing page MUST feature an imposing oversized editorial manifesto section that articulates the independent atelier operating ethos without decorative filler.

#### Scenario: Reading Studio Manifesto
- **WHEN** a visitor views the manifesto section
- **THEN** the statement "High-agency software engineered without intermediary bloat. Every query, component, and agent is crafted directly by senior hands." is displayed with fluid display typography and high contrast against the obsidian background.

### Requirement: Interactive Accessible FAQ Accordion
The studio landing page MUST provide an expandable FAQ accordion addressing studio capabilities, zero-hallucination math guarantees, and technical collaboration, engineered with full keyboard accessibility.

#### Scenario: Expanding FAQ Item with Keyboard
- **WHEN** a keyboard user focuses an FAQ accordion button and presses `Enter` or `Space`
- **THEN** the accordion panel toggles open, animating height smoothly, and updates its `aria-expanded` attribute to `true`.

#### Scenario: Collapsing FAQ Item
- **WHEN** a visitor activates an already opened accordion item
- **THEN** the panel smoothly closes and updates its `aria-expanded` attribute to `false`.

## MODIFIED Requirements

### Requirement: Architectural Hero Presentation
The landing page MUST present an imposing editorial header and studio manifesto upon arrival, establishing Membran's identity as a high-agency software atelier with twin contextual action triggers.

#### Scenario: First Viewport Render
- **WHEN** a visitor navigates to `https://membran.app`
- **THEN** the page displays the monogram `MEMBRAN`, the live telemetry beacon, the primary thesis "We engineer deterministic instruments for the post-probabilistic era.", and two direct action triggers targeting Selected Works (`#works`) and Atelier Dossier (`#atelier`).

### Requirement: Selected Work Showcase
The landing page MUST present both Maniy v2 and Quant Membran as premier production artifacts rather than generic SaaS utility cards.

#### Scenario: Inspecting Flagship Artifact
- **WHEN** the visitor views the Selected Works section
- **THEN** the page renders:
  1. **Maniy v2**: Executive Cockpit & AI Financial Reasoning Agent with real Spendable vs Locked runway canvas, stack architecture notes, and direct outbound link to `https://maniy.membran.app`.
  2. **Quant Membran**: Unified Quantitative & Statistical Bitcoin Trading Platform with 10 Statistical Families preview, verified backtest metrics (85.7% win rate, 68.96 Profit Factor), stack architecture notes, and direct outbound link to `https://quant.membran.app`.
