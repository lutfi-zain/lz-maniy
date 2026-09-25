# Spec Delta: ledger-studio

## MODIFIED Requirements

### Requirement: Full-Width Tabular Transaction Ledger
The ledger studio SHALL render user transactions using a responsive dual-presentation model: a full-width multi-column tabular grid on desktop viewports (>= 768px) and a flat, dense document-style feed with zero horizontal scrolling on mobile viewports (< 768px). Both presentations display Date, Description, Kategori, Dari Akun, Ke Akun, Status, and Amount with tabular numeric alignment, and support configurable pagination bounds.

#### Scenario: View Transaction Rows with Category Column
- **WHEN** user navigates to `/ledger` on a desktop viewport
- **THEN** each transaction row explicitly displays the resolved category name alongside its description, source wallet, and amount within a high-density tabular grid.

#### Scenario: Configure Pagination Page Size
- **WHEN** user selects a page size limit (25, 50, or 100)
- **THEN** the ledger renders the requested number of rows per page with a bounded navigation stepper.

#### Scenario: Mobile Viewport Dual-Presentation Dense Transaction Feed
- **WHEN** user navigates to `/ledger` on a mobile viewport (< 768px)
- **THEN** transactions render as a vertical dense document feed without horizontal table scrolling, displaying Description and Amount on the primary line, accompanied by Date, Category tag, and Account routing on the secondary line.
