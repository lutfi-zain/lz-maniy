## MODIFIED Requirements

### Requirement: Savings Multi-Period Horizon Board View
The Planning Studio (`/planning`) SHALL provide a dedicated multi-period Horizon Board view specifically on the Goals (Savings) sub-tab, rendered as an ultra-compact editorial matrix table across all device form factors (desktop, tablet, and mobile) to track chronological goal accumulation and milestones without vertical scroll fatigue.

#### Scenario: View Savings Goals Horizon Board
- **WHEN** user selects the `Goals` sub-tab at `/planning` and toggles view mode to `Horizon Board`
- **THEN** the interface renders an editorial matrix table with chronological monthly period columns
- **AND** the first column is horizontally frozen (`sticky left-0`) displaying each goal's name and target amount
- **AND** each period cell renders in an ultra-compact 2-line layout displaying:
  - Line 1: Progress percentage, milestone badge (`✓ 100%` or `Tercapai`) if reached, or overdue warning (`⚠️ Overdue` / `⚠️ Lewat`) if deadline elapsed
  - Line 2: Point-in-time accumulated balance formatted in tabular IDR
- **AND** table cells omit graphical progress bars and linked wallet breakdown rows to preserve high vertical information density.

#### Scenario: Goals List Mode Default
- **WHEN** user views the `Goals` sub-tab in `List` mode
- **THEN** standard horizontal goal cards are rendered with action buttons, status filters, and drawer drilldowns.

#### Scenario: Mobile and Android Viewport Accessibility
- **WHEN** user accesses the Goals Horizon Board on a mobile device or browser with a viewport under 1024px (including Android desktop-mode viewports)
- **THEN** the view mode toggle (`List` vs `Horizon Board`) remains visible and interactable
- **AND** selecting `Horizon Board` renders the full Matrix Table with sticky frozen goal column and smooth horizontal panning across monthly horizons.

#### Scenario: Interactive Row Drawer Drilldown
- **WHEN** user clicks or taps on any goal row within the Horizon Matrix Table
- **THEN** the system opens the slide-over `GoalDrawerContent` displaying detailed funding wallet allocations, live exchange rates, daily/monthly pacing calculations, and edit actions.
