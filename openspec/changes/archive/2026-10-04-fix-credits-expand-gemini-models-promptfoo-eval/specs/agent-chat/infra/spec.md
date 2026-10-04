# Spec Delta

## CHANGED Requirements

### Requirement: Credit Pricing Seed Data (CHANGED)
The D1 migration SHALL seed `credit_pricing` rows for all 12 google-antigravity Gemini models.

#### Scenario: Expanded Pricing Table Seed
- **WHEN** `wrangler d1 migrations apply` is executed
- **THEN** the `credit_pricing` table contains rows for all 12 Gemini models with appropriate per-million-token pricing:
  - Flash Lite tier (`gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`): `inputPerMillion = 0.25`, `outputPerMillion = 1.50`
  - Flash tier (`gemini-2.5-flash`, `gemini-3-flash`, `gemini-3.5-flash`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`): `inputPerMillion = 0.75`, `outputPerMillion = 3.75`
  - Pro tier (`gemini-2.5-pro`, `gemini-3-pro`, `gemini-3.1-pro`): `inputPerMillion = 1.25`, `outputPerMillion = 5.00`
- **THEN** existing seed rows for `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-3.8-flash`, and `groq/qwen3.8-27b` remain unchanged

#### Scenario: No Missing Pricing at Runtime
- **WHEN** the credit system calculates usage for any model in `AVAILABLE_MODELS`
- **THEN** a matching `credit_pricing` row exists in the database (no fallback to `FALLBACK_PRICING` for known models)
