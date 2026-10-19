-- @walkthrough 05.02:async-llm-judge
-- @topic Level 1: Semantic CoT Judge D1 Queue Schema
-- @ref https://developers.cloudflare.com/d1/ | okf://knowledge/ai-evals-course/fase-4-dataset-engineering-dan-synthetic-curation.md
-- @notes Skema D1 untuk antrean evaluasi asynchronous (eval_queue) dan kurasi kegagalan produksi (eval_dataset_candidates).
--
-- Migration: 0006_eval_flywheel
-- Asynchronous Evaluation Queue & Production-to-Dataset Flywheel Tables

CREATE TABLE IF NOT EXISTS eval_queue (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'high' | 'normal'
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'processing' | 'completed' | 'failed'
  user_message TEXT NOT NULL,
  assistant_output TEXT NOT NULL,
  tool_results_json TEXT,
  trigger_reason TEXT NOT NULL,             -- 'negative_feedback' | 'code_eval_failure' | 'sla_breach' | 'random_sample'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  locked_at INTEGER,                        -- Epoch seconds when leased to handle worker timeout reaping
  created_at INTEGER NOT NULL,
  processed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_eval_queue_status_prio
  ON eval_queue(status, priority, created_at);

CREATE TABLE IF NOT EXISTS eval_dataset_candidates (
  id TEXT PRIMARY KEY,
  source_trace_id TEXT NOT NULL,
  source_session_id TEXT NOT NULL,
  evaluator_rubric TEXT NOT NULL,          -- 'financial_soundness' | 'persona_tone_compliance' | 'tool_trajectory'
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
      'tone_format'
    )
  ),
  sanitized_prompt TEXT NOT NULL,
  sanitized_output TEXT NOT NULL,
  sanitized_tool_calls_json TEXT,          -- PII-scrubbed tool payload
  judge_score REAL NOT NULL,
  judge_reasoning TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'staged',   -- 'staged' | 'synced_remote' | 'exported_ci' | 'rejected'
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_eval_candidates_status
  ON eval_dataset_candidates(status, created_at);
