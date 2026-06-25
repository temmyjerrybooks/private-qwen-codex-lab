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

## Later Phases

- Phase 6: Diff and patch preview
- Phase 7: Edit mode
- Phase 8: Terminal execution
- Phase 9: Fix mode
- Phase 10: Auto mode
- Phase 11: GitHub workflow
- Phase 12: SSH and remote ops
- Phase 12B: Memory and project notes
- Phase 13: Polish and packaging
