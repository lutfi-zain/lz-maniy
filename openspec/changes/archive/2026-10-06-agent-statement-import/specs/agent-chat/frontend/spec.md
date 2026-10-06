## MODIFIED Requirements

### Requirement: PDF Statement Attachments with Parse Status

The chat UI SHALL support attaching bank statement PDF files (single or bulk) with per-file parse status, attaching the resulting statement session to the chat request.

#### Scenario: Attach PDFs and show parse progress
- **WHEN** the user selects one or more PDF files via the attach control
- **THEN** each file shows queued, parsing, ready, or error status with its page and row counts
- **THEN** files that fail show their error without blocking the ready files

#### Scenario: Send message with statement session attached
- **WHEN** the user sends a message with a ready statement session
- **THEN** the chat request carries the session reference (not raw rows) and the message shows the attached statement summary

#### Scenario: Statement cost awareness before sending
- **WHEN** a statement session with significant row counts is attached
- **THEN** the UI surfaces the size (files, pages, rows) so the user can judge cost before sending
