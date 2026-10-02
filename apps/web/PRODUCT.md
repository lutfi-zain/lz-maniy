# Product

## Register

product

## Users

Personal finance managers, planners, and conscious spenders looking for clarity on cashflow, multi-period projections, and goal milestones without SaaS clutter.

## Product Purpose

Maniyy V2 is a financial planning and account detail intelligence dashboard providing real-time multi-currency portfolio tracking, horizon planning, and agent assistance.

## Brand Personality

- Editorial clarity
- Utilitarian precision
- Calm confidence

## Anti-references

- Neon crypto dashboards with noisy charts and gradients
- Generic SaaS templates with heavy drop-shadows and pill-shaped cards
- Cluttered finance trackers with emojis and unformatted numbers

## Design Principles

- Utilitarian minimalism: Warm bone canvas, pure white cards, crisp 1px borders (#EAEAEA).
- Scarcity of color: Monochrome base with deliberate muted pastels (pale green, pale red, pale blue, pale yellow).
- Typographic contrast: Editorial serif headings, clean sans body, tabular monospace for financial figures.
- Macro whitespace and high density: Compact information-dense tables with generous section breathing room.

## Accessibility & Inclusion

- WCAG AA contrast ratio (>= 4.5:1 for body and data text).
- Keyboard-accessible quick shortcuts and input focus.
- Reduced-motion consideration with instant state transitions.

## Testing & Environment Configuration

- **Private Runtime Configuration**: Live and E2E integration tests require private runtime variables (`REEDRICH_TEST_API_TOKEN`, `REEDRICH_TEST_USER_ID`, `REEDRICH_TEST_USER_EMAIL`) placed in ignored private `.env` files or injected via secure CI secrets.
- **Credential Hygiene**: No hardcoded API keys or provider tokens are committed in source files, examples, or specifications.
- **Execution Safeguards**: Tests verify target and account ownership before running mutating operations.
- **Secret Scanning Command**: Run `bun run check:secrets` to scan working tree and staged files. Run `bun run check:secrets:history` to audit git history.
- **Credential Rotation**: When rotating keys, update only private environment variables (`.env`, `.dev.vars`, or CI secrets) and verify with `bun run check:secrets`.
