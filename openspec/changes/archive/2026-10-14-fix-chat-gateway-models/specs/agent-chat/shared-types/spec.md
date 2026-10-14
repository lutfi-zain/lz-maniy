## MODIFIED Requirements

### Requirement: Verified Default Models Definition
The shared package SHALL export `DEFAULT_MODELS` containing only verified OMP AI Gateway models with `google-antigravity/gemini-3.8-flash` designated as primary.

#### Scenario: DEFAULT_MODELS Array Contents
- **WHEN** `DEFAULT_MODELS` is exported from `@maniy/shared`
- **THEN** it contains:
  - `google-antigravity/gemini-3.8-flash`
  - `google-antigravity/gemini-3.5-flash-lite`
  - `google-antigravity/gemini-3.1-flash-lite`
  - `google-antigravity/gemini-2.5-flash`
  - `google-antigravity/gemini-2.5-flash-lite`
- **THEN** unsupported models (`gemini-3.7-flash`, `gemini-2.5-pro`, `gemini-3.1-pro`, `gemini-3.6-flash`, `gemini-3-pro`) are omitted
