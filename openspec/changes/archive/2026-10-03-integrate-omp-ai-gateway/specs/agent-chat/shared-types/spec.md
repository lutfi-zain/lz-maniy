# Spec Delta

## ADDED Requirements

### Requirement: OMP Provider and Curated Model Definitions

The shared types package SHALL include `'omp'` in the `ModelProvider` type union and export `DEFAULT_MODELS` containing exclusively the 4 curated OMP models: `google-antigravity/gemini-3.1-flash-lite`, `google-antigravity/gemini-3.7-flash`, `google-antigravity/gemini-3.8-flash`, and `opencode-zen/muse-spark-1.3-contributor-free`.

#### Scenario: Shared package exports OMP provider type
- **WHEN** consumer imports `ModelProvider` from `@maniyy/shared`
- **THEN** `'omp'` is accepted as a valid provider string alongside legacy providers

#### Scenario: Default models array verification
- **WHEN** consumer imports `DEFAULT_MODELS` from `@maniyy/shared`
- **THEN** the array contains exactly 4 models, with provider set to `'omp'`, and Google models configured with `thinking: true`
