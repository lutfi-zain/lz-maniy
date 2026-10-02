# agent-chat/agent-memory Specification

## Purpose
User-specific memory persistence for the Eve agent, storing wallet nicknames, cashflow patterns, and formatting preferences that are injected into the system prompt dynamic section to provide personalized, context-aware responses.

## Requirements

### Requirement: Agent Memory Persistence

The agent service SHALL persist per-user agent memory in Cloudflare D1, keyed by `userId`, containing wallet nicknames, cashflow pattern descriptions, formatting preferences, and freeform custom context.

#### Scenario: Agent memory is stored

- **WHEN** the user provides contextual information (e.g. "ingat ya BCA Main itu rekening gajian" or "saya gak suka emoji, pakai tabel aja")
- **THEN** the agent updates the persisted memory record for that user

#### Scenario: Agent memory is loaded on each request

- **WHEN** a new chat request arrives for an authenticated user
- **THEN** the agent loads the user's memory from D1 and injects relevant context into the system prompt before model invocation

### Requirement: Agent Memory System Prompt Injection

The agent service SHALL inject loaded agent memory into a dedicated section of the system prompt, providing the model with: wallet nickname mappings, the user's typical cashflow distribution pattern, formatting directives (e.g. "use tables, no emoji"), and any custom context (family member names, account numbers, recurring obligation details).

#### Scenario: System prompt includes wallet nicknames

- **WHEN** the user has wallet nicknames stored (e.g. "BCA Main = Rekening Gajian Utama")
- **THEN** the system prompt contains a section mapping walletIds to human-readable names so the agent can reference wallets naturally

#### Scenario: System prompt includes formatting preferences

- **WHEN** the user has formatting preferences stored (e.g. "no ASCII art, use markdown tables")
- **THEN** the system prompt includes those directives in the communication style section

### Requirement: Agent Memory Tool

The agent service SHALL expose a `save_memory` tool allowing the model to persist user-provided context into agent memory when the user explicitly asks to remember something or provides contextual information about their financial setup.

#### Scenario: User asks agent to remember something

- **WHEN** the user says "ingat ya nomor rekening Jago istri untuk belanja rumah"
- **THEN** the agent calls `save_memory` with the relevant key-value data and confirms it has been remembered

#### Scenario: Memory tool does not overwrite without confirmation

- **WHEN** the agent detects that saving new memory would overwrite existing conflicting data
- **THEN** the agent shows the conflict and asks the user before overwriting
