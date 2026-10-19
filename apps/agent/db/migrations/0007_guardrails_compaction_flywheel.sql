-- Migration: 0007_guardrails_compaction_flywheel
-- Expands eval_queue trigger reasons and eval_dataset_candidates domain categories
-- for Guardrails safety trips, iteration exhaustion, and compaction retention.

-- 1. Recreate eval_dataset_candidates with expanded domain_category and evaluator_rubric
CREATE TABLE IF NOT EXISTS eval_dataset_candidates_new (
  id TEXT PRIMARY KEY,
  source_trace_id TEXT NOT NULL,
  source_session_id TEXT NOT NULL,
  evaluator_rubric TEXT NOT NULL,
  domain_category TEXT NOT NULL CHECK (
    domain_category IN (
      'balance_query',
      'planning_projection',
      'transaction_filter',
      'ui_control',
      'financial_sanity',
      'multi_currency',
      'category_breakdown',
      'wallet_management',
      'debt_management',
      'safe_to_spend',
      'transaction_record',
      'budget_tracking',
      'complex_reasoning',
      'tone_format',
      'guardrail_safety',
      'compaction_retention'
    )
  ),
  sanitized_prompt TEXT NOT NULL,
  sanitized_output TEXT NOT NULL,
  sanitized_tool_calls_json TEXT,
  judge_score REAL NOT NULL,
  judge_reasoning TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'staged',
  created_at INTEGER NOT NULL
);

-- Copy existing records if old table exists
INSERT OR IGNORE INTO eval_dataset_candidates_new (
  id, source_trace_id, source_session_id, evaluator_rubric, domain_category,
  sanitized_prompt, sanitized_output, sanitized_tool_calls_json,
  judge_score, judge_reasoning, status, created_at
)
SELECT
  id, source_trace_id, source_session_id, evaluator_rubric, domain_category,
  sanitized_prompt, sanitized_output, sanitized_tool_calls_json,
  judge_score, judge_reasoning, status, created_at
FROM eval_dataset_candidates;

DROP TABLE IF EXISTS eval_dataset_candidates;
ALTER TABLE eval_dataset_candidates_new RENAME TO eval_dataset_candidates;

CREATE INDEX IF NOT EXISTS idx_eval_candidates_status
  ON eval_dataset_candidates(status, created_at);
