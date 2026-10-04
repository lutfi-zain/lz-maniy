# agent-chat/infra Specification

## Purpose
Monorepo workspace architecture with Bun, Cloudflare Workers infrastructure (Worker, D1 database, KV store, secrets), Vitest testing infrastructure with Workers pool, and path-filtered GitHub Actions CI/CD deployment pipelines.

## Requirements

### Requirement: Bun Workspaces Monorepo Layout
The repository SHALL be structured as a Bun workspaces monorepo containing `apps/web`, `apps/agent`, and `packages/shared`.

#### Scenario: Monorepo Root Package Resolution
- **WHEN** running `bun install` at the workspace root
- **THEN** a single `bun.lock` is maintained and workspaces resolve `apps/*` and `packages/*`
- **THEN** `apps/web` and `apps/agent` import `@maniyy/shared` using `workspace:*` dependencies

#### Scenario: App and Package Segregation
- **WHEN** building packages across workspaces
- **THEN** `apps/web` contains the static SvelteKit SPA without backend code
- **THEN** `apps/agent` contains the Cloudflare Worker backend and AI SDK dependencies
- **THEN** `packages/shared` compiles pure TypeScript definitions without circular references

### Requirement: Cloudflare Worker and Bindings Infrastructure
The agent backend SHALL be configured via `wrangler.toml` in `apps/agent` targeting Cloudflare Workers with D1, KV, and secret bindings.

#### Scenario: Worker Configuration and Bindings
- **WHEN** `apps/agent/wrangler.toml` is evaluated
- **THEN** it specifies:
  - `name = "maniyy-agent"`
  - `main = "src/index.ts"`
  - `compatibility_date = "2024-09-23"`
  - D1 Database binding `DB` pointing to database name `maniyy-agent-db`
  - KV Namespace binding `CONFIG` pointing to namespace `maniyy-agent-config`
  - Secrets `GEMINI_API_KEY` and `GROQ_API_KEY` configured via Cloudflare Secrets

#### Scenario: Local Worker Emulation
- **WHEN** running `bun run dev` in `apps/agent` (or `wrangler dev`)
- **THEN** the worker boots locally on port 8787 with local in-memory D1 and KV emulation for seamless full-stack local development

### Requirement: Cloudflare D1 Relational Schema and Migrations
The agent backend SHALL manage database schema migrations for conversations and messages in Cloudflare D1.

#### Scenario: Conversations Schema
- **WHEN** D1 migrations are applied
- **THEN** the `conversations` table is provisioned with:
  - `id TEXT PRIMARY KEY`
  - `user_id TEXT NOT NULL`
  - `title TEXT NOT NULL`
  - `model TEXT NOT NULL`
  - `provider TEXT NOT NULL`
  - `created_at INTEGER NOT NULL`
  - `updated_at INTEGER NOT NULL`
  - Index on `(user_id, updated_at DESC)` for efficient per-user queries

#### Scenario: Messages Schema
- **WHEN** D1 migrations are applied
- **THEN** the `messages` table is provisioned with:
  - `id TEXT PRIMARY KEY`
  - `conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE`
  - `role TEXT NOT NULL`
  - `content TEXT NOT NULL`
  - `tool_calls TEXT` (JSON-encoded array or NULL)
  - `tool_results TEXT` (JSON-encoded array or NULL)
  - `created_at INTEGER NOT NULL`
  - Index on `(conversation_id, created_at ASC)` for chronological transcript retrieval

### Requirement: Path-Filtered CI/CD Workflows
GitHub Actions workflows SHALL trigger targeted deployments based on path filtering.

#### Scenario: Web Client Deployment Workflow
- **WHEN** changes are pushed to `main` branch affecting paths in `apps/web/**` or `packages/shared/**`
- **THEN** `deploy-web.yml` executes: installs dependencies via Bun, runs type checks and tests, builds the SvelteKit static site, and publishes to Cloudflare Pages via Wrangler

#### Scenario: Agent Backend Deployment Workflow
- **WHEN** changes are pushed to `main` branch affecting paths in `apps/agent/**` or `packages/shared/**`
- **THEN** `deploy-agent.yml` executes: installs dependencies via Bun, applies pending D1 migrations (`wrangler d1 migrations apply`), and deploys `maniyy-agent` Worker via Wrangler

#### Scenario: Shared Package Triggers Dual Deployment
- **WHEN** a change modifies code only inside `packages/shared/**`
- **THEN** both `deploy-web.yml` and `deploy-agent.yml` workflows are triggered concurrently

### Requirement: Integration Testing Infrastructure with Workers Pool

The repository SHALL support isolated integration testing of Worker endpoints and database operations without live external credentials. Explicit live financial checks and evaluation runners SHALL use private runtime credentials and the authorized dedicated-test account, never embedded examples or personal-account fallbacks.

#### Scenario: Worker Integration Test Execution
- **WHEN** the agent integration tests execute in the configured Workers pool
- **THEN** they use an isolated database and mocked external financial/model endpoints
- **AND** authenticated endpoint behavior is verified without relying on live external networks or interpreting mocks as live financial-value evidence.

#### Scenario: Dedicated Test Account Configuration
- **WHEN** explicitly authorized end-to-end smoke verification targets a staging or live financial endpoint
- **THEN** the test uses private runtime `REEDRICH_TEST_API_TOKEN`, the expected `REEDRICH_TEST_USER_ID`, and approved target/destructive-run configuration
- **AND** authenticated identity must match the dedicated account before financial mutation or cleanup
- **AND** no real credential example or personal-account fallback is committed or uploaded.

#### Scenario: Evaluation Runner Configuration
- **WHEN** an evaluation requires a financial token or a selected model-provider key
- **THEN** required credentials come from private runtime variables such as `GEMINI_API_KEY` or `GROQ_API_KEY` for the selected provider
- **AND** missing configuration fails before network access with redacted errors and no embedded fallback.


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
- **WHEN** the `credit_pricing` table is created and subsequent migrations are applied
- **THEN** it contains columns: `model` (TEXT PRIMARY KEY), `input_per_million` (REAL NOT NULL), `output_per_million` (REAL NOT NULL), `updated_at` (INTEGER NOT NULL)
- **THEN** the table is seeded with pricing rows for all 12 Gemini models and the Groq fallback:
  - Lite tier (`gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`): `inputPerMillion = 0.25`, `outputPerMillion = 1.50`
  - Flash tier (`gemini-2.5-flash`, `gemini-3-flash`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`): `inputPerMillion = 0.75`, `outputPerMillion = 3.75`
  - Pro tier (`gemini-2.5-pro`, `gemini-3-pro`, `gemini-3.1-pro`): `inputPerMillion = 1.25`, `outputPerMillion = 5.00`
  - Groq vision fallback `groq/qwen3.8-27b`: `inputPerMillion = 0.80`, `outputPerMillion = 4.00`
### Requirement: Conversation Compaction Metadata Column
The agent backend D1 schema SHALL support tracking compaction state per conversation.

#### Scenario: compacted_at Column
- **WHEN** the migration is applied
- **THEN** the `conversations` table gains a nullable `compacted_at` (INTEGER) column and a nullable `compaction_summary` (TEXT) column for storing the summary text
