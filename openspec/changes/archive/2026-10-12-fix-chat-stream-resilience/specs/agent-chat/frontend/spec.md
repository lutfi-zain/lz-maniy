# agent-chat/frontend Delta Specification

## MODIFIED Requirements

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

#### Scenario: Non-Abort Stream Error Surfacing
- **WHEN** an assistant stream request to `POST /api/chat` encounters an error that is not a user abort (such as HTTP 401, HTTP 402, HTTP 500, or network disconnection)
- **THEN** the system MUST NOT silently swallow the error
- **THEN** the system MUST populate the assistant message content with a formatted error notification (e.g. `⚠️ Gagal menerima jawaban: [Pesan Error]`)
- **THEN** the streaming state MUST terminate (`isStreaming = false`) so the input and action controls are unlocked

#### Scenario: Automatic 401 Stream Token Refresh Recovery
- **WHEN** the stream request to `POST /api/chat` returns an HTTP 401 Unauthorized status and a refresh token is present
- **THEN** the chat store MUST attempt to refresh the session via `authStore.refreshSession()`
- **THEN** if refresh succeeds, the chat store MUST retry the stream request once with the new access token
- **THEN** if refresh fails, the assistant message content MUST display `⚠️ Sesi login telah berakhir. Silakan login kembali.`

#### Scenario: Terminal Empty Message State Resolution
- **GIVEN** an assistant message has completed or terminated streaming
- **WHEN** the message has no text content and no UI command
- **THEN** the message bubble MUST NOT display an indefinite "Menyusun jawaban..." loading indicator
- **THEN** the bubble MUST display a warning card with an error note and a "Coba Lagi" (retry) action button
