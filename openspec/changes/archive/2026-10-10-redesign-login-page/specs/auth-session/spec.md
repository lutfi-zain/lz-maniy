## ADDED Requirements

### Requirement: 1-Click Guest Sandbox Session Initialization
The login route MUST provide a frictionless guest sandbox mode allowing external evaluators and prospective users to test the application instantly without Google registration.

#### Scenario: Launching Guest Demo Preview
- **WHEN** user clicks "Explore Demo Sandbox" on the `/login` route
- **THEN** client immediately creates a guest session in `authStore` with guest evaluator credentials
- **THEN** client hydrates `reedrichStore` with the offline mock snapshot dataset (`MOCK_SNAPSHOT`)
- **THEN** client redirects the user to `/` (Executive Cockpit) with zero network delay or consent prompts

### Requirement: Asymmetric Editorial Split-Screen Login Surface
The `/login` route MUST present an editorial split-screen experience communicating Maniy's core liquidity partitioning thesis alongside access controls.

#### Scenario: Desktop Presentation
- **WHEN** a visitor on a desktop viewport (>= 1024px) accesses `/login`
- **THEN** the screen renders a 55/45 split layout: the left panel displays the brand thesis, Newsreader editorial typography, miniature Cockpit metrics, and studio link; the right panel renders authentication actions.

#### Scenario: Mobile Responsive Adaptation
- **WHEN** a visitor on a mobile viewport (< 1024px) accesses `/login`
- **THEN** the layout gracefully collapses into a single column with the access terminal immediately reachable and tap targets adhering to a 44px minimum touch area.
