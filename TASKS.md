# Tasks

## Phase 1 - Repository Scaffold and VS Code Extension Shell

- Create root documentation files
- Create VS Code extension package
- Add TypeScript config
- Add esbuild build script
- Add activity bar and sidebar views
- Add basic webview panel
- Register initial commands
- Add settings structure
- Add LiteLLM client skeleton
- Add workspace inspection skeleton
- Add plan mode skeleton

## Phase 2 - Modal H200:2 SGLang Deployment

- Implement Modal SGLang deployment
- Add HF token secret usage
- Add HF cache volume
- Add smoke test script

## Phase 2.5 - Multi-Provider Budget Router

- Add local provider config loading
- Add provider state tracking
- Add local usage ledger
- Add budget-aware provider selection
- Add monthly reset logic with lazy activation
- Add provider status and management commands
- Route model requests through the provider router
- Document private provider setup and cost behavior

## Phase 2.7 - Capability and Authorization System

- Add permission profile loader
- Add local ignored permissions config
- Add command allowlist/blocklist
- Add action authorization checker
- Add action logger
- Add VS Code permission settings
- Add `Borger: Show Permissions`
- Add `Borger: Update Permission Profile`
- Integrate read authorization into workspace inspection and plan mode
- Show permission profile in the Borger sidebar

## Phase 3 - LiteLLM Gateway

- Add LiteLLM config
- Add Docker Compose setup
- Add LiteLLM smoke test
- Document Modal-to-LiteLLM wiring
- Document Borger provider config for LiteLLM
- Keep provider budget routing active for model calls
- Keep permission checks active for workspace-aware planning

## Phase 4 - Workspace Context Intelligence

- Add ignore-aware file tree scanning
- Add safe file reader with size, binary, and secret-file guards
- Detect project types and frameworks
- Summarize important project files
- Capture current active file and selected text
- Collect VS Code diagnostics
- Read git branch and `git status --short` through read-only git operations
- Build structured workspace context object
- Feed workspace context into Plan Task
- Show richer context status in the Borger sidebar
- Document context behavior and troubleshooting

## Phase 5 - Plan Mode Upgrade

- Add relevant-file ranking from workspace context
- Add task complexity estimate
- Upgrade Plan Task prompt to require structured Markdown sections
- Include task understanding, repo observations, implementation steps, files likely to change, verification plan, risks, assumptions, and recommended next action
- Keep commands as recommendations only
- Return structured plan metadata to the webview
- Render complexity, relevant files, verification commands, and plan sections in the sidebar
- Keep Plan Mode read-only
- Preserve permission checks, provider routing, budget checks, LiteLLM support, and Phase 4 context

## Phase 6 - Diff and Patch Preview

- Add strict JSON edit proposal prompt
- Add model edit response parser and validation
- Add pending change state
- Build preview-only file change objects
- Generate unified diffs for create, modify, and delete proposals
- Block paths outside the workspace
- Block secret-like files while allowing `.env.example`
- Add proposed-change generation through ProviderRouter and LiteLLM
- Add sidebar pending change review controls
- Add commands for generate, show, and clear pending changes
- Keep actual file writing disabled until Phase 7
- Document proposed changes and preview-only approval behavior

## Phase 7 - Real Edit Mode and Safe File Application

- Add safe workspace write helpers
- Apply approved create and modify pending changes
- Keep delete proposals disabled
- Add applied and failed pending change statuses
- Add backup snapshots before modifying existing files
- Ignore `.borger/backups/` in git
- Add revert-last-apply support for modify backups
- Log apply, create, write, and delete authorization decisions
- Add sidebar controls for applying approved changes and one file
- Add commands for applying approved changes, applying one pending change, and reverting last apply
- Preserve provider routing, budget checks, LiteLLM support, workspace context, and permission checks
- Keep terminal execution, git push, SSH, deploy, and auto mode out of scope
- Document safe apply behavior and troubleshooting

## Phase 8 - Controlled Terminal Execution

- Add typed terminal command result objects
- Add current-session command history
- Add captured command runner using workspace-root cwd
- Add optional interactive VS Code terminal mode
- Authorize every command through `run_terminal`
- Use command policy allowlist, confirmation patterns, and blocked patterns
- Ask for confirmation when policy or configuration requires it
- Capture stdout, stderr, exit code, start/end time, and duration where practical
- Log command authorization, started, completed, failed, blocked, and cancelled events
- Add sidebar Terminal section with command input and command history
- Add manual run buttons for commands suggested by proposed changes
- Add commands for run terminal command, run suggested command, show command history, and clear command history
- Keep command execution manual; applying edits does not run commands automatically
- Keep Fix Mode, Auto Mode, GitHub workflow, SSH, and deploy automation out of scope
- Document terminal behavior and troubleshooting

## Phase 9 - Fix Mode

- Add Fix Mode prompt builders for diagnostics, current file, failed commands, and explanation-only analysis
- Add repair generation through ProviderRouter and LiteLLM
- Use VS Code diagnostics grouped and prioritized by severity
- Use captured failed command output as model context
- Focus current-file fixes on the active editor and selected text
- Parse repair proposals through the existing strict JSON edit parser
- Create pending fix diffs through the existing pending changes flow
- Keep all file writes behind Phase 7 approval and safe apply
- Keep verification commands manual through Phase 8 terminal execution
- Add sidebar Fix Mode status, actions, and result rendering
- Add commands for fixing diagnostics, last failed command, current file, and explaining last error
- Preserve permission checks, provider routing, budget checks, LiteLLM support, workspace context, and action logging
- Document Fix Mode behavior and troubleshooting

## Later Phases

- Phase 10: Auto mode
- Phase 11: GitHub workflow
- Phase 12: SSH and remote ops
- Phase 12B: Memory and project notes
- Phase 13: Polish and packaging
