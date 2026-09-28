# Spec Delta: agent-chat/frontend

## MODIFIED Requirements

### Requirement: Chat Input Controls and Accessibility
The chat UI SHALL provide accessible input controls conforming to accessibility and keyboard navigation standards, automatically focusing input on panel visibility.

#### Scenario: Multiline Text Input Handling
- **WHEN** user enters text into the message textarea and presses `Enter`
- **THEN** the message is submitted immediately
- **WHEN** user presses `Shift+Enter`
- **THEN** a new line is inserted into the textarea without sending

#### Scenario: Disabled Input During Streaming
- **WHEN** an assistant stream is actively generating
- **THEN** the send button and textarea enter a disabled/busy state with visual progress feedback, preventing duplicate concurrent submissions

#### Scenario: Accessible Focus Management
- **WHEN** the chat panel is opened via button or shortcut
- **THEN** focus shifts automatically to the message textarea
- **THEN** screen reader ARIA labels identify the chat log, input landmarks, and close controls

#### Scenario: Accessible Focus Management on Panel Mount
- **WHEN** the chat panel is opened via toggle button, keyboard shortcut (`Cmd+K`/`Ctrl+K`), or navigation back from conversation history
- **THEN** focus shifts automatically to the message textarea input element
- **THEN** user can immediately type without manually clicking the textarea

### Requirement: Streamed Message Rendering and UI Primitives
The chat UI SHALL render conversation messages incrementally using shadcn-svelte chat primitives conforming to the Maniyy V2 minimalist-ui design language, with support for assistant message retry and multi-version navigation.

#### Scenario: Streaming Response Display
- **WHEN** an assistant response is streaming from `POST /api/chat`
- **THEN** tokens render progressively inside a message bubble with a subtle cursor/streaming indicator
- **THEN** the scroll container (`MessageScroller`) automatically maintains scroll pin at the bottom until user manually scrolls up

#### Scenario: Tool Invocation and Result Feedback
- **WHEN** the agent invokes a tool during message generation
- **THEN** an inline badge/collapsible card renders in the message flow showing the tool name and execution state (pending, success, error)
- **THEN** once completed, the summary of the result is displayed without raw unformatted JSON noise

#### Scenario: Network Interruption Recovery
- **WHEN** the network connection drops or stream terminates prematurely
- **THEN** the chat bubble shows an inline error notification ("Koneksi terputus saat menerima jawaban. Silakan coba lagi.")
- **THEN** the interface remains fully operational without crashing or blank screen states

#### Scenario: Assistant Response Versioning and Retry Navigation
- **WHEN** user clicks the `Retry` (ulang jawaban) button on an assistant message bubble
- **THEN** the client appends a new variant to the message's `variants` array and streams a fresh generation without overwriting previous outputs
- **THEN** a version pager (`< i / N >`) renders in the message bubble footer allowing the user to navigate back and forth between previous and new response versions
- **THEN** switching the version updates the displayed content and tool invocations to match the selected variant

#### Scenario: Failed Stream In-Bubble Retry
- **WHEN** an assistant response generation fails or connection drops
- **THEN** an inline error indicator is displayed in the bubble with a prominent `Coba Lagi` action
- **THEN** clicking `Coba Lagi` triggers an automatic retry for that message turn

## ADDED Requirements

### Requirement: Thinking Level Selection
The chat UI SHALL provide a control to configure the model's thinking and reasoning level when supported by the active model.

#### Scenario: Select Thinking Level
- **WHEN** active model has thinking capabilities
- **THEN** user can choose between thinking levels (`Off`, `Low`, `Medium`, `High`) via the model picker popover or header controls
- **THEN** the chosen thinking level is persisted in local state and transmitted in subsequent `POST /api/chat` requests
