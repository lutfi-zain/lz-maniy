# Spec Delta

## CHANGED Requirements

### Requirement: Shared Model Definitions (CHANGED)
The shared types package SHALL define `DEFAULT_MODELS` as a list of all 12 google-antigravity Gemini models matching the backend `AVAILABLE_MODELS` list.

#### Scenario: DEFAULT_MODELS Completeness
- **WHEN** consumer imports `DEFAULT_MODELS` from `@maniyy/shared`
- **THEN** the array contains exactly 12 entries, one for each google-antigravity Gemini model: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, `gemini-3-flash`, `gemini-3-pro`, `gemini-3.1-flash-lite`, `gemini-3.1-pro`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`
- **THEN** each entry has `provider: 'omp'`, a `displayName`, `capabilities`, and `thinkingLevels` consistent with the backend model configuration

#### Scenario: ModelProvider Type
- **WHEN** consumer imports `ModelProvider` from `@maniyy/shared`
- **THEN** the type includes `'omp'` as a valid provider value
