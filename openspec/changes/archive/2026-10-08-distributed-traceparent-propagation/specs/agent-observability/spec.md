## ADDED Requirements

### Requirement: Outbound W3C Traceparent Propagation from Agent Tools to MCP Backend
The observability framework SHALL propagate the active W3C `traceparent` header and project identifier on every outgoing HTTP or Service-Binding request from `apps/agent` tools (`createApiClient`) to the ReedRich MCP backend (`finnplan-mcp`).

#### Scenario: Tool RPC Traceparent Header Injection
- **WHEN** an agent tool (via AI SDK `streamText` or native `createGeminiRunner`) invokes `createApiClient().request(path, init)` while an active span (`reedrich.rpc:*` or `tool:*`) is open
- **THEN** `createApiClient` injects `traceparent: 00-<traceId>-<activeSpanId>-01`, `x-project-name: <projectName>`, and `x-phoenix-project: <projectName>` into the outgoing request headers so downstream `reedrich-mcp` spans attach as children of the active RPC span within the same Phoenix trace waterfall

### Requirement: Dashboard REST Store W3C Traceparent Propagation
The financial dashboard store (`ReedrichStore` in `apps/web/src/lib/stores/reedrich.svelte.ts`) SHALL attach a W3C `traceparent` header on all outgoing REST read and CRUD mutation requests.

#### Scenario: Automatic Traceparent Header on Dashboard REST Calls
- **WHEN** `ReedrichStore.request(url, init)` executes any read (`fetchSnapshot`, `fetchTransactions`, `fetchHorizonProjections`, `fetchWallets`, etc.) or write (`createTransaction`, `createTransfer`, `updateBudget`, etc.) call
- **THEN** the store attaches a valid W3C `traceparent` header (`^00-[0-9a-f]{32}-[0-9a-f]{16}-01$`) unless one was already explicitly provided in `init.headers`
