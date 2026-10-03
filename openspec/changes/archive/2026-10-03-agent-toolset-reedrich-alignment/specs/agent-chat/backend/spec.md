# Spec Delta

## ADDED Requirements

### Requirement: Full Precision Timestamp and Mutation Parameter Alignment
The agent service SHALL support ISO-8601 date-time timestamps (with hours, minutes, seconds, and timezone) and complete mutation payloads across all transaction and transfer tools matching the Reedrich REST API.

#### Scenario: Agent updates transaction date and time
- **WHEN** user requests changing the time of a transaction (e.g. "ubah jam transaksi makan siang tadi jadi 13:45")
- **THEN** the agent calls `update_transaction` with `date` formatted as an ISO-8601 string containing the specified hour, minute, and WIB timezone offset (`YYYY-MM-DDTHH:mm:ss+07:00`)
- **THEN** the mutation passes validation and updates the transaction in Reedrich without rejection

#### Scenario: Agent assigns transaction to a budget
- **WHEN** user asks to update or create a transaction tied to a specific budget (e.g. "alokasikan transaksi ini ke budget Liburan")
- **THEN** `update_transaction` and `create_transaction` accept `budgetId` and pass it to the Reedrich API payload

#### Scenario: Agent records categorized transfer with admin fee
- **WHEN** user requests transferring money with an admin fee and category (e.g. "transfer 500k dari BCA ke Jago, kena biaya admin 2500 kategori Biaya Transfer")
- **THEN** `create_transfer` accepts `sourceWalletId`, `targetWalletId`, `amount`, `adminFee`, `categoryId`, and `date` (ISO-8601) and forwards all fields to `POST /api/v1/transfers`

### Requirement: Comprehensive Transaction Query and Full-Fidelity Output Mapping
The agent service SHALL expose complete search and filter parameters on `list_transactions` and return transaction records with full-fidelity fields including `transactionId`, full `transactionDate`, and relation IDs.

#### Scenario: Agent queries transactions by keyword or status
- **WHEN** user asks for specific transactions by search term (e.g. "cari transaksi Kopi Kenangan") or status (e.g. "daftar transaksi rencana bulan ini")
- **THEN** `list_transactions` accepts `q` (or `search`), `type`, `isPlanned`, `budgetId`, `targetWalletId`, and `orderBy` in addition to date and wallet filters
- **THEN** the request parameters map directly to query parameters for `GET /api/v1/transactions`

#### Scenario: Agent receives transaction ID and timestamp in query output
- **WHEN** `list_transactions` returns matching records to the model
- **THEN** each mapped item contains `id` (matching `transactionId`), `date` (full ISO string from `transactionDate`), `amount`, `walletId`, `targetWalletId`, `categoryId`, `budgetId`, `type`, `isPlanned`, and `desc`
- **THEN** the model can reference the transaction by its exact `id` for subsequent updates or deletions without guessing

### Requirement: Recurring Template Application Overrides
The agent service SHALL support occurrence overrides when realizing recurring template transactions via `apply_recurring`.

#### Scenario: Agent applies recurring template with amount override
- **WHEN** user confirms realizing a recurring obligation with an adjusted amount (e.g. "realisasikan tagihan listrik PLN, bulan ini nominalnya 485.000")
- **THEN** `apply_recurring` accepts optional `transactionId`, `executionDate` (ISO-8601), and `actualAmount`
- **THEN** the agent sends `POST /api/v1/recurring-templates/{templateId}/apply` with the override payload

### Requirement: Single Entity Drilldown Tools (Get by ID)
The agent service SHALL expose dedicated tools for inspecting single financial entities by their unique identifier without requiring full list scanning.

#### Scenario: Agent retrieves single transaction by ID
- **WHEN** the agent needs to inspect or verify a specific transaction after mutation or error
- **THEN** the agent calls `get_transaction` with `transactionId`
- **THEN** the service calls `GET /api/v1/transactions/{transactionId}` and returns the complete transaction entity

#### Scenario: Agent retrieves single wallet, budget, goal, or recurring template by ID
- **WHEN** the agent needs details for a single wallet, budget, goal, or recurring template by its identifier
- **THEN** the agent can invoke `get_wallet`, `get_budget`, `get_goal`, or `get_recurring`
- **THEN** the service fetches the entity via the respective `GET /api/v1/{resource}/{id}` endpoint
