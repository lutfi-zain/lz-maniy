# entity-lifecycle Specification

## Purpose
Manages temporal and financial lifecycle classifications (in-progress, overdue, completed, and cancelled for goals; active period versus past period for budgets) with deterministic status resolution, badge formatting, and segmented view filtering.

## Requirements

### Requirement: Goal Temporal and Financial Lifecycle Resolution
The system SHALL resolve every financial goal into one of four distinct lifecycle states: `completed`, `overdue`, `in_progress`, or `long_term`.

#### Scenario: Goal Successfully Completed
- **WHEN** a goal's current accumulated amount is greater than or equal to its target amount (`currentAmount >= targetAmount`), or its persisted status is `completed`
- **THEN** the goal's resolved lifecycle status is `completed`
- **AND** the goal renders a success badge (`✓ TERCAPAI` in IDR locale) and a deep forest green progress indicator (`#346538`).

#### Scenario: Goal Overdue Past Target Date
- **WHEN** a goal's target date is strictly earlier than the current calendar date (`targetDate < today`) and `currentAmount < targetAmount`
- **THEN** the goal's resolved lifecycle status is `overdue`
- **AND** the goal renders a warning overdue badge (`⚠️ LEWAT TENGGAT`) with elapsed day count and remaining nominal shortfall.

#### Scenario: Goal Actively In Progress
- **WHEN** a goal's target date is on or after the current calendar date (`targetDate >= today`) and `currentAmount < targetAmount`
- **THEN** the goal's resolved lifecycle status is `in_progress`
- **AND** the goal renders standard remaining day pacing and nominal headroom.

#### Scenario: Long-Term Goal Without Target Date
- **WHEN** a goal has a null target date (`targetDate === null`) and `currentAmount < targetAmount`
- **THEN** the goal's resolved lifecycle status is `long_term`
- **AND** the goal renders a neutral badge (`JANGKA PANJANG`).

### Requirement: Budget Temporal Period Classification
The system SHALL classify budgets into active current periods versus expired historical periods based on `periodEnd` and `periodStart`.

#### Scenario: Active Budget in Current Horizon
- **WHEN** the current date falls between `periodStart` and `periodEnd` (inclusive)
- **THEN** the budget is classified as `active_period` and rendered in the primary active budget view.

#### Scenario: Expired Historical Budget
- **WHEN** a budget's `periodEnd` is strictly earlier than the current date
- **THEN** the budget is classified as `past_period`
- **AND** the card displays with subtle visual muting (opacity 85%) and a neutral badge indicating the expired period span.

### Requirement: Lifecycle Segmented Filtering
The system SHALL provide interactive segmented filters for goals and budgets.

#### Scenario: Filter Goals by Lifecycle Tab
- **WHEN** user selects the `Lewat Tenggat` tab on the Goals workbench
- **THEN** only goals classified as `overdue` are rendered
- **AND** tab badges display counts of matching goals per status category.

#### Scenario: Filter Budgets by Period Tab
- **WHEN** user selects `Periode Berjalan` tab on the Budgets workbench
- **THEN** only budgets classified as `active_period` are displayed
- **WHEN** user switches to `Riwayat Lampau` tab
- **THEN** only budgets with `past_period` are displayed.
