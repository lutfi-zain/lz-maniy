-- Migration: 0005_expand_credit_pricing
-- Seed credit pricing for all remaining google-antigravity Gemini models (USD per 1M tokens)

INSERT OR IGNORE INTO credit_pricing (model, input_per_million, output_per_million, updated_at) VALUES
  -- Lite tier ($0.25 input / $1.50 output per 1M tokens)
  ('google-antigravity/gemini-2.5-flash-lite', 0.25, 1.50, 1728000000000),
  ('google-antigravity/gemini-3.5-flash-lite', 0.25, 1.50, 1728000000000),

  -- Flash tier ($0.75 input / $3.75 output per 1M tokens)
  ('google-antigravity/gemini-2.5-flash', 0.75, 3.75, 1728000000000),
  ('google-antigravity/gemini-3-flash', 0.75, 3.75, 1728000000000),
  ('google-antigravity/gemini-3.5-flash', 0.75, 3.75, 1728000000000),
  ('google-antigravity/gemini-3.6-flash', 0.75, 3.75, 1728000000000),

  -- Pro tier ($1.25 input / $5.00 output per 1M tokens)
  ('google-antigravity/gemini-2.5-pro', 1.25, 5.00, 1728000000000),
  ('google-antigravity/gemini-3-pro', 1.25, 5.00, 1728000000000),
  ('google-antigravity/gemini-3.1-pro', 1.25, 5.00, 1728000000000);
