## MODIFIED Requirements

### Requirement: Docked Chat Panel Layout

The chat UI SHALL render as a docked right-side panel on desktop viewports and as a fullscreen overlay on mobile viewports, both toggleable without route changes. On desktop, the panel SHALL support a maximized state that expands it to a near-fullscreen overlay and restores the previous docked width on exit.

#### Scenario: Maximize and restore panel width
- **GIVEN** the chat panel is open on a desktop viewport at a docked width
- **WHEN** the user activates the maximize control
- **THEN** the panel expands to a near-fullscreen overlay
- **WHEN** the user activates the restore control
- **THEN** the panel returns to its previous docked width

#### Scenario: Maximized state is not persisted across sessions
- **GIVEN** the user maximized the chat panel
- **WHEN** the page is reloaded
- **THEN** the panel reopens at the last docked width, not maximized

#### Scenario: Header controls remain reachable at minimum width
- **GIVEN** the chat panel is resized to its 280px minimum width
- **WHEN** the header renders
- **THEN** the conversation title and the close control MUST remain visible and interactive
- **THEN** secondary controls MUST collapse into icon-only or overflow states rather than clipping the close control

### Requirement: Markdown Message Rendering

The chat UI SHALL render assistant message markdown with tables that scroll horizontally inside the message bubble instead of overflowing it.

#### Scenario: Wide agent table scrolls inside the bubble
- **GIVEN** an assistant message contains a markdown table wider than the message bubble
- **WHEN** the message renders
- **THEN** the table MUST be scrollable horizontally within the bubble
- **THEN** no table content may overflow outside the bubble bounds
