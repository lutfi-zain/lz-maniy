-- Migration: 0004_credits
-- User credit balance tracking
CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  balance REAL NOT NULL DEFAULT 2000,
  lifetime_used REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Credit transaction ledger
CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  credits_used REAL NOT NULL,
  conversation_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user
  ON credit_transactions(user_id, created_at DESC);

-- Model credit pricing configuration
CREATE TABLE IF NOT EXISTS credit_pricing (
  model TEXT PRIMARY KEY,
  input_per_million REAL NOT NULL,
  output_per_million REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed initial pricing for supported models (USD per 1M tokens)
INSERT OR IGNORE INTO credit_pricing (model, input_per_million, output_per_million, updated_at) VALUES
  ('google-antigravity/gemini-3.1-flash-lite', 0.25, 1.50, 1727913600000),
  ('google-antigravity/gemini-3.7-flash', 0.75, 3.75, 1727913600000),
  ('google-antigravity/gemini-3.8-flash', 0.75, 3.75, 1727913600000),
  ('groq/qwen3.8-27b', 0.80, 4.00, 1727913600000);

-- Compaction columns on conversations
ALTER TABLE conversations ADD COLUMN compacted_at INTEGER;
ALTER TABLE conversations ADD COLUMN compaction_summary TEXT;
