# Spec Delta

## ADDED Requirements

### Requirement: Thinking Text Collapsible Display
The chat UI SHALL render model thinking/reasoning text in a collapsible accordion section within assistant message bubbles.

#### Scenario: Thinking Accordion During Stream
- **WHEN** an assistant response is streaming and thinking deltas (`g:` prefix) arrive before answer text
- **THEN** a collapsible "Sedang berpikir..." section renders above the answer content in the ChatBubble
- **THEN** the section auto-collapses once answer text begins streaming
- **THEN** the user can expand/collapse the thinking section at any time by clicking the header

#### Scenario: Thinking Text in Completed Message
- **WHEN** a completed assistant message contains a non-empty `thinking` field
- **THEN** a collapsed "Proses berpikir" accordion is rendered above the answer content
- **THEN** expanding the accordion reveals the full thinking text rendered as plain text (not markdown)

#### Scenario: No Thinking Available
- **WHEN** an assistant message has no `thinking` field or thinking is empty
- **THEN** no thinking accordion is rendered — only the answer content displays

### Requirement: Input Focus Guard
The chat UI SHALL auto-focus the chat textarea only when no other text input field is active.

#### Scenario: Focus When No Active Input
- **WHEN** the chat panel opens and no other input/textarea/contentEditable element in the page has focus
- **THEN** the chat textarea receives focus automatically (desktop only, viewport >= 1024px)

#### Scenario: Preserve Active Input Focus
- **WHEN** the chat panel opens or conversation list closes while the user's cursor is active in another input field (e.g., search box, amount input, description textarea)
- **THEN** the chat textarea does NOT steal focus
- **THEN** the other input field retains its focus and cursor position

#### Scenario: Focus After Dismissing Other Input
- **WHEN** the user blurs from all other input fields and the chat panel is open
- **THEN** focus does not automatically return to the chat textarea (user must click to focus)

### Requirement: Credit Balance Display
The chat UI SHALL display the user's remaining credit balance and per-turn cost information.

#### Scenario: Credit Gauge in Chat Panel
- **WHEN** the chat panel is open and the user is authenticated
- **THEN** a compact credit indicator displays near the model picker showing remaining credits (e.g., "1,847 credits")
- **THEN** the indicator updates after each completed message turn using the `creditsRemaining` value from stream finish metadata

#### Scenario: Per-Turn Cost Feedback
- **WHEN** a streaming response completes and stream finish metadata includes `creditsUsed`
- **THEN** a subtle per-turn cost annotation appears briefly (e.g., "-8.3 credits") near the credit indicator before fading

#### Scenario: Zero Balance Warning
- **WHEN** the user's credit balance reaches 0 or the backend returns HTTP 402
- **THEN** the chat input is disabled with a message "Kredit habis" displayed in the input area
- **THEN** the credit indicator shows "0 credits" with a warning color (pale red)

### Requirement: Context Usage Indicator
The chat UI SHALL display conversation context window utilization.

#### Scenario: Context Gauge Display
- **WHEN** a streaming response completes and stream finish metadata includes `contextUsage`
- **THEN** a compact progress indicator near the model picker shows the percentage of context window used (e.g., "42% context")
- **THEN** the indicator color shifts from normal to warning (pale yellow) at >= 70% and critical (pale red) at >= 90%

#### Scenario: Compaction Notification
- **WHEN** the backend triggers automatic compaction during a request
- **THEN** a brief inline notification appears in the message flow: "Riwayat percakapan dirangkum untuk menghemat konteks."

### Requirement: Default Model and Thinking Level Change
The chat UI SHALL initialize with the updated default model and thinking level.

#### Scenario: Initial Default State
- **WHEN** the ChatStore initializes without prior user selection
- **THEN** `selectedModel` defaults to `google-antigravity/gemini-3.7-flash` (provider `omp`)
- **THEN** `thinkingLevel` defaults to `'medium'`

#### Scenario: Model Picker Categories Update
- **WHEN** the model picker dropdown renders
- **THEN** no "OpenCode Zen" category or `opencode-zen/muse-spark-1.3-contributor-free` model appears
- **THEN** only "Google Antigravity" models are listed
