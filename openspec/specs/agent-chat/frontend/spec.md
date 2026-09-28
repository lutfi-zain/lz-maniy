# agent-chat/frontend Specification

## Purpose
Right-side embedded chat panel UI for Maniyy V2 providing real-time streaming AI interaction, model selection, conversation management, local image attachments, and bidirectional execution of UI orchestration commands within a minimalist design aesthetic.

## Requirements

### Requirement: Responsive Panel Layout and Docking
The chat UI SHALL render as a docked right-side panel on desktop viewports and as a fullscreen overlay on mobile viewports, both toggleable without route navigation.

#### Scenario: Desktop Docked Layout
- **WHEN** viewport width is $\ge$ 1024px (desktop) and chat panel is opened
- **THEN** the panel mounts on the right side of the screen with a default width of 20% of the viewport width (min 280px, max 50%)
- **THEN** the panel features a left-side resize drag handle allowing continuous horizontal resizing
- **THEN** the chosen panel width is persisted to browser `localStorage` and restored across page refreshes

#### Scenario: Mobile Fullscreen Overlay
- **WHEN** viewport width is < 1024px (mobile) and chat panel is opened
- **THEN** the panel renders as a 100vw/100vh modal overlay covering the screen
- **THEN** a prominent back/close button is presented in the panel header to dismiss the overlay and return to the underlying screen

#### Scenario: Global Toggle from Topbar
- **WHEN** user clicks the chat panel toggle icon button in the global Topbar
- **THEN** the panel toggles between open and closed states
- **THEN** the main layout content adjusts or overlays cleanly without layout jump or horizontal document scrollbars

#### Scenario: Keyboard Shortcut Toggle
- **WHEN** user presses `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) from any screen
- **THEN** the chat panel toggles visibility
- **THEN** existing single-key shortcuts (such as `N` for new transaction) continue to function when focus is not inside the chat panel text input

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
### Requirement: UI Command Interpretation and Execution
The chat UI SHALL interpret structured `ui_command` payloads returned by agent tool executions and dispatch corresponding application actions.

#### Scenario: Execute Page Navigation Command
- **WHEN** the assistant returns a UI command `{ type: 'ui_command', command: 'navigate', payload: { route: '/planning' } }`
- **THEN** the frontend client executes SvelteKit `goto('/planning')` and displays an inline confirmation toast/badge

#### Scenario: Execute Filter and Tab Commands
- **WHEN** the assistant returns a UI command for `filter`, `tab`, or `date_range`
- **THEN** the client mutates the respective stores (`DateFilterStore`, active tab rune, or institution filter) immediately updating the visible view

#### Scenario: Execute Drawer and Form Opening Commands
- **WHEN** the assistant returns a UI command for `drawer` or `transaction_form`
- **THEN** the client opens `DrawerStore` or `TransactionFormStore` prefilled with the specified payload

#### Scenario: Execute Focus Element Command
- **WHEN** the assistant returns `{ type: 'ui_command', command: 'focus', payload: { selector: '#budget-card-groceries' } }`
- **THEN** the client scrolls the element into view with smooth scrolling and briefly applies an accent ring/highlight

### Requirement: Multi-Provider and Model Selection
The chat UI SHALL provide a model selector dropdown populated from the backend models list.

#### Scenario: Select Model for Conversation
- **WHEN** user opens the model selector dropdown in the chat header
- **THEN** available models from Gemini and Groq are displayed with their providers and capability badges
- **THEN** selecting a model updates the active conversation configuration and persists the choice for subsequent messages

### Requirement: Conversation Lifecycle Management
The chat UI SHALL support full lifecycle management for conversations including list, create, switch, auto-titling, and deletion.

#### Scenario: New Conversation Initiation
- **WHEN** user clicks `[+ Percakapan Baru]`
- **THEN** an empty conversation workspace is created and the message list clears
- **THEN** sending the first message automatically triggers title generation from the message content

#### Scenario: Conversation History Sidebar
- **WHEN** user toggles the conversation history drawer/sidebar
- **THEN** past conversations are listed with their titles, timestamps, and message counts
- **THEN** clicking a conversation loads its messages into the active panel

#### Scenario: Empty State Handling
- **WHEN** the user has no conversations in history
- **THEN** the sidebar displays a minimalist empty state with prompt suggestions ("Cek sisa budget bulan ini", "Ringkasan total kekayaan bersih")

#### Scenario: Delete Conversation
- **WHEN** user triggers delete on a conversation item and confirms
- **THEN** the conversation is removed from local state, deleted via `DELETE /api/conversations/:id`, and if it was active, a blank conversation is loaded

### Requirement: Export and Import Capabilities
The chat UI SHALL allow users to export and import conversations as standard JSON files.

#### Scenario: Exporting Conversations
- **WHEN** user chooses `Export Chat` from the panel menu
- **THEN** client downloads a `.json` file containing conversation records and messages

#### Scenario: Importing Conversations
- **WHEN** user uploads an exported `.json` file via the import modal
- **THEN** client sends the payload to `/api/conversations/import`, refetches the conversation list, and switches to the imported session

### Requirement: Image Attachments with Client-Side Cache Degradation
The chat UI SHALL support image attachments from paste or file selection, storing images locally in memory while degrading gracefully when the session expires.

#### Scenario: Attach Image via Paste or Picker
- **WHEN** user pastes an image from the clipboard or selects a file via file input
- **THEN** a thumbnail preview appears above the chat input box with a dismiss button
- **THEN** sending the message transmits the image payload to the agent endpoint

#### Scenario: Cache Degradation Fallback
- **WHEN** an older message containing an image is viewed after the browser memory cache has been cleared or across fresh browser restarts
- **THEN** the message renders a clean minimalist placeholder indicator ("[Gambar lampiran]") instead of broken image tags or throwing runtime errors

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
### Requirement: Thinking Level Selection
The chat UI SHALL provide a control to configure the model's thinking and reasoning level when supported by the active model.

#### Scenario: Select Thinking Level
- **WHEN** active model has thinking capabilities
- **THEN** user can choose between thinking levels (`Off`, `Low`, `Medium`, `High`) via the model picker popover or header controls
- **THEN** the chosen thinking level is persisted in local state and transmitted in subsequent `POST /api/chat` requests
