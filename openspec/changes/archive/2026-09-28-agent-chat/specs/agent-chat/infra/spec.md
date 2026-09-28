# Spec Delta

## Purpose
Monorepo workspace architecture with Bun, Cloudflare Workers infrastructure (Worker, D1 database, KV store, secrets), Vitest testing infrastructure with Workers pool, and path-filtered GitHub Actions CI/CD deployment pipelines.

## ADDED Requirements

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
The repository SHALL support automated integration testing of Cloudflare Worker endpoints and D1 database queries using `@cloudflare/vitest-pool-workers`.

#### Scenario: Worker Integration Test Execution
- **WHEN** executing `bun run test:integration` in `apps/agent`
- **THEN** tests run inside the Miniflare/Workers pool environment with an isolated in-memory D1 database and mocked external HTTP endpoints (Reedrich and LLM providers)
- **THEN** authenticated endpoints are verified against simulated responses without relying on live external networks

#### Scenario: Dedicated Test Account Configuration
- **WHEN** executing end-to-end smoke verification against staging/Reedrich live endpoints
- **THEN** the test suite uses dedicated test credentials (`apiKey=$REEDRICH_TEST_API_TOKEN`, `userId=usr_muhwbsfe_722e117da986448e`) to avoid interfering with production user data
