-- Migration: 0003_agent_memory
-- Agent memory table for user-specific financial context, wallet nicknames, and directives
CREATE TABLE IF NOT EXISTS agent_memory (
  user_id TEXT PRIMARY KEY,
  wallet_nicknames TEXT DEFAULT '{}',
  cashflow_pattern TEXT DEFAULT '',
  formatting_preferences TEXT DEFAULT '[]',
  custom_context TEXT DEFAULT '',
  updated_at INTEGER NOT NULL
);
