# Spec Delta

## MODIFIED Requirements

### Requirement: Active Spending Budgets Workspace
The planning studio SHALL display category and period-based spending limits, calculating live utilization percentages, explicit remaining nominal headroom towards 100%, and distinct overrun representations when limits are exceeded.

#### Scenario: Display Budget Utilization Bar and Headroom on Safe Budget
- **WHEN** user views an active budget whose realized spending is below the allowance (e.g. Spent Rp 3.700.000 out of Limit Rp 5.000.000, 74%)
- **THEN** the card displays a progress bar filled to 74% using the standard charcoal fill (`#111111`)
- **AND** displays an on-track status badge
- **AND** displays the primary remaining headroom metric as `"Sisa Rp 1.300.000 lagi"` in Indonesian or `"Rp 1,300,000 remaining"` in English
- **AND** displays the secondary utilization ratio as `"Rp 3.700.000 / Rp 5.000.000"`.

#### Scenario: Display Budget in Warning State near Limit
- **WHEN** user views an active budget whose utilization is between 80% and 99% (e.g. Spent Rp 850.000 out of Limit Rp 1.000.000, 85%)
- **THEN** the card displays a warning status badge (`bg-[#FEF3C7] text-[#92400E]`)
- **AND** the progress bar fill renders in warning amber (`#D97706`)
- **AND** displays remaining headroom with warning emphasis (`"Sisa Rp 150.000 lagi"` / `"Rp 150,000 remaining"`).

#### Scenario: Display Budget in Over-Budget State
- **WHEN** user views an active budget whose realized spending exceeds the limit (e.g. Spent Rp 5.750.000 out of Limit Rp 5.000.000, 115%)
- **THEN** the card displays an over-budget status badge (`bg-[#FDEBEC] text-[#9F2F2D]`)
- **AND** the progress bar fill caps visually at 100% width using crimson fill (`#9F2F2D`)
- **AND** the headroom metric explicitly indicates the overrun as `"Melebihi batas Rp 750.000"` in Indonesian or `"Over limit by Rp 750,000"` in English
- **AND** the overrun amount renders in muted crimson (`#9F2F2D`).
