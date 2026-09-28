# Proposal

## Why

The Ledger Studio frontend currently supports full CRUD only for transactions. All other financial entities (Wallets, Categories, Budgets, Goals, Recurring Templates) are read-only display cards that open detail drawers but offer no create, edit, or delete capability. The Reedrich API now exposes complete CRUD endpoints for every entity, including newly added `DELETE /wallets/{id}`, `PATCH/DELETE /categories/{id}`, `PATCH/DELETE /budgets/{id}`, `DELETE /debts-loans/{id}`, and `PATCH /me`. The frontend must catch up to enable users to manage their full financial setup without relying on API tools or the MCP agent.

## What Changes

- Add store methods to `ReedrichStore` for create, update, and delete operations on Wallets, Categories, Budgets, Goals, Recurring Templates, and User Profile via the Reedrich REST API
- Extend the drawer system with create/edit form drawers for each entity type, following the existing `transaction-form` drawer pattern
- Add inline delete confirmation with error handling (e.g., wallet balance must be 0, system category protected)
- Replace hardcoded mock recurring templates on `/planning` with live API data from `GET /api/v1/recurring-templates`
- Add `PATCH /api/v1/me` integration for user profile editing (firstName, lastName, whatsappNumber)
- Add TypeScript interfaces in `@maniyy/shared` for all new request/response payloads
- Add Vitest unit tests for every new store method
- Add Playwright E2E tests exercising full CRUD flows against the Reedrich test account (`testbot@maniyy.dev`, API key `rd_live_6133a5ec...`)

## Capabilities

### New Capabilities

- `entity-crud/wallet`: Full CRUD management for user wallets (create, edit, delete) with drawer-based forms
- `entity-crud/category`: Full CRUD management for expense/income categories with drawer-based forms
- `entity-crud/budget`: Full CRUD management for spending budgets with period date pickers and category linking
- `entity-crud/goal`: Full CRUD management for savings goals including wallet linking, contribution, and target editing
- `entity-crud/recurring`: Full CRUD management for recurring transaction templates, replacing mock data with live API integration
- `entity-crud/profile`: User profile update capability (name, WhatsApp number) via `PATCH /me`
- `entity-crud/e2e-testing`: End-to-end test suite exercising all CRUD operations against the live Reedrich test API

### Modified Capabilities

- `financial-store`: Extend with CRUD methods for wallets, categories, budgets, goals, recurring templates, and profile
- `drilldown-drawer`: Extend with create/edit form drawer types for each new entity

## Non-Goals

- Debts & Loans CRUD (deferred to a future change)
- Offline CRUD operations (mutations require network connectivity)
- Batch operations (bulk delete, bulk edit)
- Data import/export functionality
