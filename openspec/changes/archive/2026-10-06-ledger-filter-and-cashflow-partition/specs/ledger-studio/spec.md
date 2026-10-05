## MODIFIED Requirements

### Requirement: Searchable Multi-Select and Inbound URL Filters

The ledger studio SHALL provide transaction filtering by search keyword and support inbound URL navigation with `search` query parameter, matching behavior for `walletId`, `budgetId`, `type`, and date presets.

#### Scenario: Inbound navigation with search query parameter applies keyword filter
- **WHEN** a user navigates to `/ledger?search=Tabungan%20Darurat`
- **THEN** the search input field MUST display "Tabungan Darurat"
- **THEN** the server transaction query MUST include `q=Tabungan%20Darurat`
- **THEN** the transaction list MUST only show transactions matching the search term

#### Scenario: Cross-page link from Planning Goal redirects to pre-filtered Ledger
- **GIVEN** a goal named "Dana Darurat" on the Planning page
- **WHEN** the user clicks the goal title link (`/ledger?search=Dana%20Darurat`)
- **THEN** the user is navigated to the Ledger page
- **THEN** the search filter is applied with "Dana Darurat"
- **THEN** the ledger query is filtered accordingly

#### Scenario: Cross-page link from Planning Obligation redirects to pre-filtered Ledger
- **GIVEN** a debt with person name "Budi Santoso" on the Planning page
- **WHEN** the user clicks the debt card link (`/ledger?search=Budi%20Santoso`)
- **THEN** the Ledger page loads with the search input set to "Budi Santoso"
- **THEN** the transaction table displays only transactions matching "Budi Santoso"
