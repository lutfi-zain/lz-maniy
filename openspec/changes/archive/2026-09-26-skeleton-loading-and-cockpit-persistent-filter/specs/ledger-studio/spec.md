# Spec Delta: ledger-studio

## ADDED Requirements

### Requirement: Structured Skeleton Loading Presentation for Ledger Studio

The ledger studio SHALL render structured skeleton placeholder rows and summary strip indicators while transactions or live snapshots are being fetched from the backend.

#### Scenario: Display Tabular Skeletons During Ledger Query
- **WHEN** user visits `/ledger` and `reedrichStore.isLedgerLoading` is true
- **THEN** the transaction container displays an animated skeleton table header and multiple skeleton rows matching column widths, eliminating layout shift
- **THEN** the summary strip renders skeleton badges for counts and monetary aggregates
