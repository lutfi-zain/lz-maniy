# Spec Delta

## ADDED Requirements

### Requirement: Credit System D1 Schema Migration
The agent backend SHALL include a D1 migration adding tables for credit balances, transactions, and pricing configuration.

#### Scenario: Migration File Creation
- **WHEN** `wrangler d1 migrations apply` is executed
- **THEN** a migration creates three tables: `user_credits`, `credit_transactions`, and `credit_pricing`

#### Scenario: user_credits Table Schema
- **WHEN** the `user_credits` table is created
- **THEN** it contains columns: `user_id` (TEXT PRIMARY KEY), `balance` (REAL NOT NULL DEFAULT 2000), `lifetime_used` (REAL NOT NULL DEFAULT 0), `created_at` (INTEGER NOT NULL), `updated_at` (INTEGER NOT NULL)

#### Scenario: credit_transactions Table Schema
- **WHEN** the `credit_transactions` table is created
- **THEN** it contains columns: `id` (TEXT PRIMARY KEY), `user_id` (TEXT NOT NULL), `model` (TEXT NOT NULL), `input_tokens` (INTEGER NOT NULL), `output_tokens` (INTEGER NOT NULL), `credits_used` (REAL NOT NULL), `conversation_id` (TEXT), `created_at` (INTEGER NOT NULL)
- **THEN** an index exists on `(user_id, created_at DESC)`

#### Scenario: credit_pricing Table Schema
- **WHEN** the `credit_pricing` table is created
- **THEN** it contains columns: `model` (TEXT PRIMARY KEY), `input_per_million` (REAL NOT NULL), `output_per_million` (REAL NOT NULL), `updated_at` (INTEGER NOT NULL)
- **THEN** the table is pre-seeded with pricing rows for each model in `AVAILABLE_MODELS`: `google-antigravity/gemini-3.1-flash-lite` (0.25, 1.50), `google-antigravity/gemini-3.7-flash` (0.75, 3.75), `google-antigravity/gemini-3.8-flash` (0.75, 3.75), and the Groq vision fallback `groq/qwen3.8-27b` (0.80, 4.00)

### Requirement: Conversation Compaction Metadata Column
The agent backend D1 schema SHALL support tracking compaction state per conversation.

#### Scenario: compacted_at Column
- **WHEN** the migration is applied
- **THEN** the `conversations` table gains a nullable `compacted_at` (INTEGER) column and a nullable `compaction_summary` (TEXT) column for storing the summary text
