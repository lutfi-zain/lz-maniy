# credential-hygiene Specification

## Purpose
Protect application and test credentials from repository, build, diagnostic, and history exposure, and define an auditable cutover to sanitized Git history without losing legitimate changes.

## Requirements

### Requirement: Private Runtime Credential Sources

The system MUST obtain real API keys, provider keys, and live-test credentials exclusively from private runtime environment configuration or authorized secret stores. Tracked examples MUST contain variable names and non-credential placeholders only. A browser build MUST NOT include a shared account credential or use a public environment variable as a secret fallback.

#### Scenario: Live test credentials are supplied privately
- **WHEN** an authorized live test run is configured
- **THEN** its API credential is read from private configuration and injected into ephemeral test authentication at runtime
- **AND** the credential is absent from tracked source, examples, built client assets, and reports.

#### Scenario: Missing required credentials
- **WHEN** a credential-dependent test or evaluation runner starts without its required private configuration
- **THEN** it fails before authenticated network requests or mutations, with a message naming the missing variable but not a credential value
- **AND** it does not fall back to an embedded key, another user's account, or mocked financial data as live proof.

#### Scenario: Ordinary browser authentication
- **WHEN** an end user opens a deployed browser application without authentication
- **THEN** it requires the supported user authentication flow rather than automatically selecting a shared built-in account.

### Requirement: Credential Exposure Containment

Every discovered real or credential-looking embedded value MUST be treated as exposed until its issuer confirms revocation or rotation. Sanitizing repository text MUST NOT be reported as revoking the value, and new values MUST NOT be copied into the cleanup map or Git history.

#### Scenario: Exposed credentials are contained
- **WHEN** repository inspection identifies an embedded financial or model-provider credential
- **THEN** its owner revokes or rotates it through the issuer's authorized mechanism before the replacement is used
- **AND** the remediation record contains only the credential family, location, and containment status.

### Requirement: Secret-Free Repository and Diagnostics

The repository MUST reject real credential values in tracked content and reachable commit/tag content, including specifications, archived artifacts, evaluation scripts, and commit messages. Diagnostics and test artifacts MUST exclude raw credentials, authentication headers, credential-bearing browser storage, and private replacement maps.

#### Scenario: A credential is added to tracked content
- **WHEN** a source or documentation change introduces a credential recognized by the maintained secret rules
- **THEN** the repository secret check fails and identifies the affected location without printing the value.

#### Scenario: A leak remains in reachable history
- **WHEN** current source is clean but an exposed value remains in an older reachable commit or annotated tag
- **THEN** the history check fails rather than declaring remediation complete.

#### Scenario: Failure diagnostics are produced
- **WHEN** a live test fails or history sanitation generates reports
- **THEN** entity IDs, dates, statuses, expected values, and actual values can be reported
- **AND** raw tokens, authentication storage, and secret replacement material are not logged or uploaded.

### Requirement: History Sanitation Preserves Legitimate Work

History sanitation MUST remove exposed credential text while retaining legitimate tracked file changes and all approved branch/tag work. Rewritten commit IDs and branch transitions MUST be recorded without exposing secret material. The cutover MUST NOT discard unrelated local changes or merge the contaminated commit graph back into sanitized history.

#### Scenario: All approved refs are sanitized
- **WHEN** a history rewrite is executed in an approved maintenance window
- **THEN** all affected approved branch and tag refs point to sanitized commits
- **AND** a source/change-preservation review and a reachable-history scan both succeed.

#### Scenario: An old clone has unpublished work
- **WHEN** a contributor or automation clone contains changes absent from the rewrite input
- **THEN** those changes are preserved and sanitized before any destructive reset or replacement
- **AND** an unreviewed reset, merge, or rebase from the contaminated graph is prohibited.

### Requirement: Explicit Remote and Clone Cutover Approval

Remote ref publication, removal of old refs/reflogs/caches, and destructive clone resets MUST require separate execution approval after their affected scope is disclosed. No force push is automatic. The remediation status MUST distinguish local sanitation from published-ref and consumer-clone completion.

#### Scenario: Local rewrite is complete but remote publication is not approved
- **WHEN** local history has been sanitized but remote publication has not been approved or completed
- **THEN** the result is reported as locally sanitized with remote cutover pending
- **AND** remote history is not described as clean.

#### Scenario: A sanitized remote is adopted
- **WHEN** an approved operator publishes sanitized refs and their scan passes
- **THEN** each participating clone adopts only the sanitized graph after its unpublished work is protected
- **AND** old credential-bearing objects are not restored through normal synchronization.

### Requirement: Live Financial Account Authorization

Before live financial data is read or erased, the runner MUST have an explicitly authorized target, a private credential, the expected dedicated test-user identity, and an explicit destructive-run authorization. It MUST verify the authenticated identity against the expected user before cleanup. Authorization for public documentation reads or artifact planning MUST NOT be treated as permission for authenticated production access.

#### Scenario: Dedicated test identity matches
- **WHEN** all required live-run authorization is supplied and the authenticated user matches the dedicated test identity
- **THEN** the runner can proceed to the approved account cleanup scope.

#### Scenario: Personal or unexpected identity
- **WHEN** the authenticated user differs from the expected test identity
- **THEN** the runner aborts before deleting or creating any financial entity.

#### Scenario: Production target lacks explicit authorization
- **WHEN** the configured endpoint is a production target without explicit permission for that target and dedicated account
- **THEN** the runner sends no authenticated production request, including identity preflight.
