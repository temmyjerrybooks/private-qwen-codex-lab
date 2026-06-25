# Borger — Full Project Scope Document

## 1. Project Overview

**Project name:** Borger
**Product type:** Private VS Code coding-agent extension
**Primary interface:** Visual Studio Code extension
**Secondary interface:** Optional CLI helper later
**Model hosting:** Modal H200:2
**Primary model:** `huihui-ai/Huihui-Qwen3-Coder-Next-abliterated`
**Serving engine:** SGLang
**Fallback serving engine:** vLLM
**Gateway/router:** LiteLLM
**API style:** OpenAI-compatible `/v1/chat/completions`

Borger is a private personal-use AI coding assistant that works inside VS Code like Codex, Claude Code, Cursor Agent, or other agentic developer tools. The user should be able to open any project folder in VS Code, open the Borger extension sidebar, give Borger a task, and have Borger inspect the codebase, plan the work, generate patches, apply edits, run commands, read errors, fix issues, and summarize the final result.

This is not a public SaaS product in the initial version. It is a private personal coding tool.

---

## 2. Product Vision

Borger should become a powerful VS Code-based coding agent that can:

1. Understand the current workspace.
2. Read and reason across multiple files.
3. Explain files, selected code, errors, and architecture.
4. Plan features before editing.
5. Generate high-quality code changes.
6. Show clear diffs before applying changes.
7. Apply patches safely and accurately.
8. Run terminal commands inside VS Code.
9. Read build/test/lint errors.
10. Fix errors in an iterative loop.
11. Create clean commit summaries.
12. Work with the user like a senior software engineer inside VS Code.

The desired experience is not a simple chatbot. The goal is an agent that can perform real developer workflows.

---

## 3. Core User Experience

The expected user flow:

```text
User opens VS Code
↓
User opens a project folder
↓
User clicks the Borger sidebar icon
↓
User types a task:
“Add Supabase authentication and protect the dashboard routes”
↓
Borger inspects the workspace
↓
Borger creates a plan
↓
Borger proposes file changes
↓
User reviews diffs
↓
Borger applies approved changes
↓
Borger runs build/test commands
↓
Borger reads errors
↓
Borger fixes errors
↓
Borger summarizes completed work
```

Borger must feel like an AI engineer living inside VS Code.

---

## 4. Non-Negotiable Product Direction

Borger must be built as a **VS Code extension first**.

Do not make Open WebUI the main product.
Do not make a normal ChatGPT clone.
Do not make a browser-first app.
Do not build a public SaaS platform in the first version.

The main interface is VS Code.

Open WebUI may be mentioned only as an optional debugging/testing interface, not as the core product.

---

## 5. Private Personal-Use Mode

Borger is for private personal use.

Do not build:

* public signup
* public billing
* public account management
* public dashboard
* public moderation layer
* refusal-wrapper middleware
* public abuse-detection system
* public rate-limit product system
* marketplace publishing flow in the first version

Do build:

* local VS Code configuration
* VS Code SecretStorage for sensitive values
* `.env.example` for local development
* clear setup documentation
* endpoint connection testing
* local/private API key handling
* protection against accidental destructive workspace operations
* confirmation before mass delete, overwrite, or large irreversible file changes

The project should remain private and developer-focused.

---

## 6. High-Level Architecture

```text
VS Code Extension
  ↓
Borger Agent Core
  ↓
Workspace Tools
  - list files
  - read files
  - write files
  - search repo
  - read selection
  - get diagnostics
  - show diffs
  - apply patches
  - run terminal commands
  - inspect git status
  ↓
LiteLLM Gateway
  ↓
Modal H200:2 Endpoint
  ↓
SGLang Server
  ↓
huihui-ai/Huihui-Qwen3-Coder-Next-abliterated
```

---

## 7. Technology Stack

### VS Code Extension

Use:

* TypeScript
* VS Code Extension API
* Webview View API
* VS Code SecretStorage
* VS Code workspace APIs
* VS Code diagnostics APIs
* VS Code terminal APIs
* VS Code diff editor APIs

Recommended packages:

```text
@types/vscode
typescript
esbuild
openai
zod
fast-glob
ignore
diff
execa
nanoid
```

### Model Gateway

Use:

* LiteLLM
* OpenAI-compatible API interface
* Model alias: `qwen3-coder-next-abliterated-h200`

### Model Hosting

Use:

* Modal
* H200:2 GPU configuration
* Modal Secret for Hugging Face token
* Modal Volume for Hugging Face cache
* SGLang server
* vLLM fallback server

### Model

Primary model:

```text
huihui-ai/Huihui-Qwen3-Coder-Next-abliterated
```

Fallback model if needed:

```text
huihui-ai/Huihui-Qwen3-Coder-30B-A3B-Instruct-abliterated
```

---

## 8. Required Repository Structure

Create the project using this structure:

```text
borger/
  README.md
  PROJECT_SCOPE.md
  PROJECT_BRIEF.md
  TASKS.md
  ACCEPTANCE_CRITERIA.md
  .env.example
  .gitignore

  apps/
    vscode-extension/
      package.json
      tsconfig.json
      esbuild.js
      README.md

      src/
        extension.ts
        config.ts

        panels/
          AgentPanel.ts
          SettingsPanel.ts
          ChangesPanel.ts

        webview/
          index.html
          main.ts
          styles.css

        agent/
          loop.ts
          planner.ts
          executor.ts
          prompts.ts
          memory.ts
          taskState.ts
          contextBuilder.ts

        model/
          litellmClient.ts
          types.ts

        tools/
          workspace.ts
          readFile.ts
          writeFile.ts
          searchRepo.ts
          applyPatch.ts
          runTerminal.ts
          git.ts
          diagnostics.ts
          selection.ts
          fileTree.ts

        ui/
          diffProvider.ts
          statusBar.ts
          notifications.ts
          outputChannel.ts

        commands/
          openAgent.ts
          askAboutFile.ts
          fixSelection.ts
          explainSelection.ts
          generateTests.ts
          planTask.ts
          inspectWorkspace.ts
          testModelConnection.ts
          runAgentTask.ts

      media/
        borger-icon.svg

  infra/
    modal/
      modal_qwen_h200_sglang.py
      modal_qwen_h200_vllm.py
      requirements.txt
      README.md

    litellm/
      litellm_config.example.yaml
      README.md

    docker/
      docker-compose.litellm.yml
      README.md

  packages/
    shared/
      package.json
      tsconfig.json
      src/
        types.ts
        prompts.ts
        constants.ts

  scripts/
    smoke_test_modal_endpoint.py
    smoke_test_litellm.py
    check_env.py

  docs/
    vscode_extension_usage.md
    modal_setup.md
    huggingface_setup.md
    litellm_setup.md
    deployment_guide.md
    agent_modes.md
    troubleshooting.md
    cost_control.md
    development_workflow.md
```

---

## 9. Extension Name and Branding

Extension display name:

```text
Borger
```

Package name:

```text
borger-vscode-agent
```

Command prefix:

```text
borger
```

Examples:

```text
Borger: Open Agent
Borger: Ask About Current File
Borger: Explain Selection
Borger: Plan Task
Borger: Inspect Workspace
Borger: Test Model Connection
Borger: Run Agent Task
```

Default model alias:

```text
qwen3-coder-next-abliterated-h200
```

Activity bar title:

```text
Borger
```

Sidebar sections:

```text
Agent
Tasks
Changes
Memory
Settings
```

---

## 10. Configuration Requirements

Borger must support these configuration values:

```text
BORGER_LITELLM_BASE_URL
BORGER_LITELLM_API_KEY
BORGER_MODEL
BORGER_MODE
BORGER_MAX_CONTEXT_FILES
BORGER_MAX_FILE_SIZE_KB
BORGER_CONFIRM_BEFORE_APPLY
BORGER_CONFIRM_BEFORE_TERMINAL
```

VS Code settings should include:

```json
{
  "borger.litellmBaseUrl": "http://localhost:4000/v1",
  "borger.model": "qwen3-coder-next-abliterated-h200",
  "borger.mode": "plan",
  "borger.maxContextFiles": 80,
  "borger.maxFileSizeKb": 300,
  "borger.confirmBeforeApply": true,
  "borger.confirmBeforeTerminal": true
}
```

Sensitive values such as API keys should be stored using VS Code SecretStorage where possible.

---

## 11. Agent Modes

Borger should support these modes:

### 11.1 Ask Mode

Purpose:

* Ask questions about the current file, selection, or workspace.
* No edits.
* No terminal commands.

Examples:

```text
Explain this file.
What does this function do?
Where is the authentication logic?
```

### 11.2 Plan Mode

Purpose:

* Inspect workspace.
* Create an implementation plan.
* Do not edit files.

Examples:

```text
Plan how to add Stripe billing.
Plan how to refactor the dashboard.
Plan how to deploy this app to Vercel.
```

### 11.3 Edit Mode

Purpose:

* Generate code changes.
* Show diffs.
* Ask before applying.

Examples:

```text
Add the login page.
Refactor this API route.
Generate tests for this service.
```

### 11.4 Fix Mode

Purpose:

* Read diagnostics/build errors.
* Propose fixes.
* Show diffs.
* Apply with confirmation.

Examples:

```text
Fix this TypeScript error.
Fix the failing build.
Fix the failing tests.
```

### 11.5 Auto Mode

Purpose:

* Plan.
* Edit.
* Run commands.
* Read errors.
* Fix errors.
* Repeat until success or max loop limit.

Auto mode must be implemented later, after the safer foundation is working.

### 11.6 Commit Mode

Purpose:

* Inspect git diff.
* Summarize changes.
* Generate commit message.
* Optionally run `git commit` after confirmation.

---

## 12. Main VS Code Features

### 12.1 Activity Bar View

Borger must add an icon to the VS Code activity bar.

The sidebar should include:

* Agent chat panel
* Current workspace summary
* Recent tasks
* Pending changes
* Settings shortcut

### 12.2 Agent Webview

The main Borger panel should include:

* chat/task input
* mode selector
* current model display
* connection status
* workspace name
* response area
* task timeline
* plan view
* diff preview area
* run output area later

### 12.3 Command Palette Commands

Implement these commands:

```text
Borger: Open Agent
Borger: Ask About Current File
Borger: Explain Selection
Borger: Fix Selection
Borger: Generate Tests
Borger: Plan Task
Borger: Inspect Workspace
Borger: Test Model Connection
Borger: Run Agent Task
```

### 12.4 Editor Context Menu

Add context menu actions for selected code:

```text
Ask Borger
Explain Selection
Fix Selection
Generate Tests
Refactor Selection
```

### 12.5 Workspace Inspection

Borger must be able to:

* detect workspace root
* list files
* respect `.gitignore` where practical
* ignore `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`
* read package files
* detect framework type where possible
* summarize project structure
* read current open file
* read selected text
* read diagnostics/errors
* inspect git status

### 12.6 Diff Preview

Borger must support:

* previewing proposed edits
* showing before/after diff
* applying selected file changes
* rejecting selected changes
* applying all changes
* regenerating changes

### 12.7 Terminal Execution

Later phases must support:

* running commands in VS Code terminal
* capturing output where possible
* summarizing command output
* feeding errors back into the agent
* rerunning commands after fixes

---

## 13. Modal Deployment Scope

Borger needs a robust Modal deployment for the model.

### 13.1 Primary Modal Deployment

File:

```text
infra/modal/modal_qwen_h200_sglang.py
```

Requirements:

* Modal app name: `borger-qwen3-coder-next-h200`
* GPU: `H200:2`
* Model: `huihui-ai/Huihui-Qwen3-Coder-Next-abliterated`
* Serving engine: SGLang
* Tensor parallelism: `--tp 2`
* OpenAI-compatible API endpoint
* Port: `30000`
* Hugging Face cache volume
* Hugging Face token from Modal Secret
* Startup timeout configured
* Scale-down window configured
* Good comments explaining important settings

### 13.2 Fallback Modal Deployment

File:

```text
infra/modal/modal_qwen_h200_vllm.py
```

Requirements:

* Same model
* vLLM fallback
* OpenAI-compatible endpoint
* Tensor parallelism where needed
* Comments explaining fallback use

### 13.3 Modal Secrets

Required Modal secret:

```text
huggingface-secret
```

Expected key:

```text
HF_TOKEN
```

### 13.4 Modal Volume

Use a Modal Volume for Hugging Face cache to avoid re-downloading large model files every time.

Suggested volume name:

```text
borger-qwen-cache
```

---

## 14. LiteLLM Scope

Borger should use LiteLLM as a local or hosted gateway between the VS Code extension and Modal.

File:

```text
infra/litellm/litellm_config.example.yaml
```

Required model alias:

```text
qwen3-coder-next-abliterated-h200
```

Example shape:

```yaml
model_list:
  - model_name: qwen3-coder-next-abliterated-h200
    litellm_params:
      model: openai/huihui-ai/Huihui-Qwen3-Coder-Next-abliterated
      api_base: https://YOUR_MODAL_ENDPOINT.modal.run/v1
      api_key: dummy-key

general_settings:
  master_key: "sk-private-local-key"
```

Do not hardcode real secrets.

---

## 15. Prompting Requirements

Borger should use structured prompts.

### 15.1 System Prompt

Borger’s system prompt should define the model as a direct, practical, senior coding agent.

Use this as the starting system prompt:

```text
You are Borger, a private VS Code coding agent.

You help the user build, debug, refactor, test, and deploy software projects from inside VS Code.

Be direct, technical, and implementation-focused.

Prefer concrete file-level instructions, diffs, commands, and working code.

When planning, inspect the workspace context and produce a clear step-by-step implementation plan.

When editing, propose precise changes and preserve the existing project style.

When fixing errors, identify the root cause, patch the relevant files, and rerun or recommend the correct verification command.

Do not invent files that do not exist unless creating them is part of the task.

Do not make destructive changes without clearly identifying them first.

Assume this is a private developer workflow.
```

### 15.2 Plan Prompt

Plan mode should ask the model to return:

```text
1. Understanding of the task
2. Relevant files likely involved
3. Step-by-step implementation plan
4. Risks/unknowns
5. Verification commands
6. Whether edits are required
```

### 15.3 Patch Prompt

Patch mode should ask the model to return structured proposed edits.

Preferred patch output:

```json
{
  "summary": "Short summary of intended changes",
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "action": "modify",
      "reason": "Why this file changes",
      "content": "Full updated file content or patch block"
    }
  ],
  "commandsToRun": [
    "npm run build"
  ]
}
```

### 15.4 Error Fix Prompt

Fix mode should include:

```text
- user task
- relevant files
- command run
- command output
- diagnostics
- current git diff
```

The model should return:

```text
- likely cause
- file changes needed
- patch
- verification command
```

---

## 16. Safety and Reliability Rules for Workspace Changes

This is not a public safety system. These are reliability rules to avoid breaking the user’s project.

Borger should:

1. Never silently delete many files.
2. Never silently overwrite `.env`, `.env.local`, production secrets, or lockfiles without explaining why.
3. Ask before running commands that modify infrastructure, database schema, migrations, or deployments.
4. Ask before running commands involving `rm -rf`, force push, reset hard, or destructive git operations.
5. Show diffs before applying changes in the earlier versions.
6. Keep a clear task log.
7. Stop after a max number of auto-fix loops to avoid infinite edits.
8. Always summarize files changed and commands run.

These rules are for developer control and project reliability.

---

## 16A. Robust Authorized Engineering Agent Requirement

Borger must become a robust authorized engineering agent, not just a chat assistant.

The target workflow is a serious VS Code coding agent similar to Codex, Claude Code, Cursor Agent, and other agentic developer tools. Borger must eventually support full authorized engineering workflows inside VS Code when explicitly enabled by the user.

This remains a private personal/group-use system. Do not build public account sharing, public signup, billing, marketplace behavior, or public user management.

### 16A.1 Workspace Access

When permitted, Borger must be able to:

* inspect project folders
* read files
* search the codebase
* understand project structure
* read current file and selected text
* read VS Code diagnostics
* read package/dependency files
* detect frameworks and build tools

### 16A.2 Code Editing

When permitted, Borger must be able to:

* create new files
* modify existing files
* rename files
* delete files only when authorized
* generate patches
* show diffs before applying
* apply selected diffs
* reject diffs
* restore previous file content where possible
* keep a summary of changed files

### 16A.3 Terminal Execution

When permitted, Borger must be able to:

* run terminal commands from VS Code
* run build commands
* run test commands
* run lint/type-check commands
* run install commands
* run project scripts
* capture terminal output where practical
* feed command errors back into the agent
* repeat fix loops until success or max iterations

### 16A.4 Git and GitHub Workflow

When permitted, Borger must be able to:

* inspect git status
* inspect git diff
* create branches
* stage files
* generate commit messages
* commit changes after authorization
* push to GitHub after authorization
* create PR descriptions
* optionally use GitHub CLI if installed
* never hardcode GitHub tokens
* store credentials securely through system or VS Code mechanisms

### 16A.5 SSH and Remote Server Workflow

When explicitly enabled, Borger must be able to support remote workflows while remaining conservative:

* support SSH only when explicitly enabled
* run SSH commands only against allowed hosts
* use existing user SSH configuration where possible
* never store private SSH keys in the repo
* support remote deploy commands when authorized
* summarize all remote commands before and after execution
* block or require confirmation for destructive remote commands

### 16A.6 Deployment Workflow

When permitted, Borger must be able to:

* run deploy-related commands when authorized
* support Modal deploy/test commands
* support Vercel, Netlify, Fly.io, Railway, and Docker commands when present in the project
* read deployment logs where possible
* fix deployment errors
* update deployment docs

### 16A.7 Auto Engineer Mode

Auto Mode should eventually perform this loop:

* understand task
* inspect workspace
* create plan
* identify files
* propose edits
* apply approved edits, or auto-apply if trusted mode is enabled
* run verification commands
* read errors
* fix errors
* repeat until success or max loop limit
* summarize changes
* optionally commit and push if allowed

### 16A.8 Authorization System

Borger must have a local capability permission system.

Supported permission profiles:

* `read_only`
* `plan_only`
* `edit_with_review`
* `trusted_workspace`
* `full_auto`
* `remote_ops`

Default profile:

```text
edit_with_review
```

#### read_only

* can inspect files
* can explain code
* cannot edit files
* cannot run terminal commands
* cannot use git write operations
* cannot use SSH

#### plan_only

* can inspect workspace
* can create plans
* cannot edit files
* cannot run terminal commands

#### edit_with_review

* can propose diffs
* can apply edits after user approval
* can run safe read-only commands
* asks before terminal commands

#### trusted_workspace

* can edit workspace files
* can run configured safe commands
* can run build/test/lint
* asks before destructive commands
* asks before git push, deploy, or SSH

#### full_auto

* can plan, edit, run tests, fix errors, and summarize
* can use git commit if enabled
* still must block or require confirmation for destructive commands unless explicitly allowed

#### remote_ops

* can use SSH and remote deployment commands only for configured allowed hosts
* must log all remote actions
* must never store private keys in repo

### 16A.9 Permission Configuration

Add support for these configuration values:

```text
BORGER_PERMISSION_PROFILE=edit_with_review
BORGER_CAN_READ_WORKSPACE=true
BORGER_CAN_WRITE_WORKSPACE=true
BORGER_CAN_RUN_TERMINAL=true
BORGER_CAN_USE_GIT=true
BORGER_CAN_PUSH_GITHUB=false
BORGER_CAN_USE_SSH=false
BORGER_CAN_DEPLOY=false
BORGER_CAN_RUN_DESTRUCTIVE_COMMANDS=false
BORGER_REQUIRE_CONFIRMATION_FOR_DESTRUCTIVE=true
BORGER_REQUIRE_CONFIRMATION_FOR_GIT_PUSH=true
BORGER_REQUIRE_CONFIRMATION_FOR_SSH=true
BORGER_MAX_AUTO_FIX_LOOPS=5
```

Create local ignored config:

```text
.borger/permissions.local.json
```

Example:

```json
{
  "profile": "trusted_workspace",
  "capabilities": {
    "canReadWorkspace": true,
    "canWriteWorkspace": true,
    "canRunTerminal": true,
    "canUseGit": true,
    "canPushGitHub": true,
    "canUseSSH": false,
    "canDeploy": true,
    "canRunDestructiveCommands": false
  },
  "allowedCommands": [
    "npm",
    "pnpm",
    "yarn",
    "node",
    "python",
    "pip",
    "git",
    "gh",
    "modal",
    "docker"
  ],
  "blockedCommandPatterns": [
    "rm -rf",
    "git reset --hard",
    "git push --force",
    "format",
    "shutdown",
    "del /s"
  ],
  "allowedSshHosts": []
}
```

### 16A.10 Security and Reliability Rules

Borger must:

* not commit local permission files
* not commit tokens, SSH keys, Modal keys, GitHub tokens, or `.env` secrets
* require confirmation for destructive commands unless explicitly disabled
* block commands outside the workspace unless the user enables `remote_ops`
* keep an action log for edits, commands, git operations, and SSH operations
* show final summary of all files changed and commands run
* stop auto loops after `BORGER_MAX_AUTO_FIX_LOOPS`
* stop and explain the issue if command execution fails repeatedly

---

## 17. Phase-by-Phase Execution Plan for Codex

Codex must execute this project phase by phase.

Do not attempt to build the whole project in one pass.

At the end of each phase:

1. Stop.
2. Summarize changed files.
3. Explain how to test.
4. List known limitations.
5. Wait for the next instruction.

---

# Phase 1 — Repository Scaffold and VS Code Extension Shell

## Goal

Create the complete repository foundation and a working VS Code extension shell.

## Build

* Root documentation files
* VS Code extension package
* TypeScript config
* Build script
* Activity bar view
* Basic webview panel
* Basic command registration
* Settings structure
* LiteLLM client skeleton
* Workspace inspection skeleton
* Plan mode skeleton

## Commands to Implement

```text
Borger: Open Agent
Borger: Inspect Workspace
Borger: Test Model Connection
Borger: Plan Task
```

## Acceptance Criteria

* `npm install` works inside `apps/vscode-extension`
* `npm run compile` works
* Pressing `F5` launches Extension Development Host
* Borger appears in the VS Code sidebar/activity bar
* `Borger: Open Agent` opens the webview
* `Borger: Inspect Workspace` returns a basic workspace summary
* `Borger: Test Model Connection` attempts a call to LiteLLM
* `Borger: Plan Task` can send a plan prompt to the model
* No file edits are made in Phase 1

---

# Phase 2 — Modal H200:2 SGLang Deployment

## Goal

Create a robust Modal deployment for the 80B abliterated coding model.

## Build

* `infra/modal/modal_qwen_h200_sglang.py`
* Modal image setup
* HF token secret usage
* HF cache volume
* H200:2 GPU function
* SGLang launch server
* OpenAI-compatible endpoint
* Smoke test script

## Acceptance Criteria

* Modal app deploys successfully
* Model begins loading from Hugging Face
* Model cache persists
* Endpoint exposes OpenAI-compatible routes
* `/v1/models` test works if supported
* `/v1/chat/completions` smoke test works
* Docs explain setup and deployment

---

# Phase 2.7 — Capability and Authorization System

## Goal

Create Borger's local capability permission system so later edit, terminal, git, deployment, SSH, and auto workflows can be authorized safely.

## Build

* permission profile loader
* local ignored permissions config
* command allowlist/blocklist
* action authorization checker
* action logger
* VS Code settings for permissions
* `Borger: Show Permissions` command
* `Borger: Update Permission Profile` command

## Acceptance Criteria

* Borger can load permission profile.
* Borger can show current permissions.
* Borger can check whether an action is allowed.
* Borger blocks unauthorized edits, terminal commands, git operations, and SSH actions.
* Borger logs allowed actions.
* Borger can be configured for trusted personal use.
* Secrets and local permission configs are ignored by git.

---

# Phase 3 — LiteLLM Gateway

## Goal

Connect LiteLLM to the Modal model endpoint.

## Build

* LiteLLM config example
* Docker Compose for LiteLLM
* Smoke test script
* Docs for running LiteLLM locally

## Acceptance Criteria

* LiteLLM starts locally
* LiteLLM exposes OpenAI-compatible endpoint
* Model alias `qwen3-coder-next-abliterated-h200` works
* Smoke test sends chat request through LiteLLM to Modal
* Borger extension can test connection through LiteLLM

---

# Phase 4 — Workspace Context Intelligence

## Goal

Make Borger understand the current project better.

## Build

* `.gitignore` aware file scanning
* current file reader
* selected text reader
* diagnostics reader
* git status reader
* package/framework detection
* context builder
* workspace summary generator

## Acceptance Criteria

* Borger can summarize the workspace
* Borger can identify likely project type
* Borger can include current file and selection in prompts
* Borger can read VS Code diagnostics
* Borger can include git status in task context

---

# Phase 5 — Plan Mode Upgrade

## Goal

Make Plan Mode feel professional and repo-aware.

## Build

* structured prompt
* relevant file selection
* project summary
* task breakdown
* verification commands
* plan rendering inside webview

## Acceptance Criteria

* User can enter a task
* Borger inspects workspace
* Borger returns a structured implementation plan
* Plan includes relevant files and commands
* No edits are made in Plan Mode

---

# Phase 6 — Diff and Patch Preview

## Goal

Allow Borger to propose real code edits without applying them blindly.

## Build

* structured edit response parser
* patch generator
* full-file update support
* diff viewer
* apply/reject controls
* pending changes panel

## Acceptance Criteria

* Borger can propose file edits
* User can preview diffs
* User can apply one file
* User can reject one file
* User can apply all
* Borger summarizes applied changes

---

# Phase 7 — Edit Mode

## Goal

Enable Borger to modify code after user approval.

## Build

* Edit Mode command
* file writing tool
* patch validation
* backup/restore strategy
* changed files summary

## Acceptance Criteria

* Borger can modify existing files
* Borger can create new files
* Borger does not edit files outside workspace
* Borger shows changes before applying
* Applied changes appear in VS Code source control

---

# Phase 8 — Terminal Execution

## Goal

Allow Borger to run project commands inside VS Code.

## Build

* terminal command runner
* command approval UI
* output capture strategy
* output capture/logging
* command history
* safe command detection using the capability system
* output summarization
* error feedback to model

## Acceptance Criteria

* Borger can propose commands
* User can approve commands
* Borger can run commands in VS Code terminal
* Borger can capture or display command output
* Borger can include command output in the next model call
* Borger blocks terminal commands not allowed by the current permission profile
* Borger logs terminal actions

---

# Phase 9 — Fix Mode

## Goal

Allow Borger to fix diagnostics, build errors, and test failures.

## Build

* diagnostic context
* error prompt
* patch proposal
* fix loop
* verification command support

## Acceptance Criteria

* Borger can read current VS Code diagnostics
* Borger can interpret build/test errors
* Borger can propose fixes
* Borger can apply fixes after approval
* Borger can recommend or rerun verification commands

---

# Phase 10 — Auto Mode

## Goal

Make Borger perform full agentic task execution.

## Build

* task loop
* plan step
* edit step
* command step
* error-fix step
* max loop limit
* task state tracking
* task summary

## Acceptance Criteria

* User gives a feature/fix task
* Borger creates a plan
* Borger proposes edits
* Borger applies approved edits
* Borger runs commands
* Borger reads errors
* Borger fixes errors
* Borger stops after success or max loops
* Borger gives final summary

---

# Phase 11 — GitHub Workflow

## Goal

Help the user finalize work through local git and authorized GitHub workflows.

## Build

* git diff summary
* git status/diff
* branch creation
* commit message generator
* optional branch helper
* optional commit command
* push after authorization
* PR description generator
* optional GitHub CLI integration

## Acceptance Criteria

* Borger can summarize git changes
* Borger can generate commit message
* Borger can propose branch name
* Borger can generate PR description
* Borger asks before running git write commands
* Borger asks before pushing to GitHub
* Borger never hardcodes GitHub tokens
* Borger uses system or VS Code credential mechanisms where possible

---

# Phase 12 — SSH and Remote Ops

## Goal

Allow Borger to run SSH and remote deployment workflows only when explicitly enabled and authorized.

## Build

* SSH host allowlist
* remote command runner
* remote deployment helper
* remote output logging
* strict authorization checks

## Acceptance Criteria

* Borger can load allowed SSH hosts from local ignored config.
* Borger blocks SSH when `remote_ops` or explicit SSH permission is not enabled.
* Borger only runs SSH commands against allowed hosts.
* Borger uses existing user SSH configuration where possible.
* Borger never stores private SSH keys in the repo.
* Borger logs all remote actions.
* Borger requires confirmation for destructive remote commands.

---

# Phase 12B — Memory and Project Notes

## Goal

Let Borger remember project-specific instructions.

## Build

* `.borger/` project folder
* project memory file
* architecture notes
* user preferences
* ignored files
* reusable task summaries

Suggested files:

```text
.borger/
  memory.md
  architecture.md
  preferences.json
  task-history.jsonl
```

## Acceptance Criteria

* Borger can read project memory
* Borger can update memory after user approval
* Borger can include memory in future prompts
* Memory is local to the project

---

# Phase 13 — Polish and Packaging

## Goal

Make the extension stable and professional.

## Build

* improved UI
* better error messages
* loading states
* connection status
* output channel logs
* extension icon
* packaged VSIX build
* local install instructions

## Acceptance Criteria

* Extension can be packaged as `.vsix`
* Extension can be installed locally
* UI is clean and usable
* Errors are understandable
* Documentation is complete

---

## 18. Required Documentation

Create these docs:

### `README.md`

Must explain:

* what Borger is
* high-level architecture
* quick start
* development setup
* deployment overview
* phase status

### `PROJECT_BRIEF.md`

Must explain:

* problem
* solution
* target user
* product vision
* non-goals

### `TASKS.md`

Must list all phases and tasks.

### `ACCEPTANCE_CRITERIA.md`

Must list acceptance criteria for every phase.

### `docs/vscode_extension_usage.md`

Must explain:

* how to run extension in development mode
* how to configure LiteLLM URL/API key/model
* how to use sidebar
* how to use commands

### `docs/modal_setup.md`

Must explain:

* Modal account setup
* Modal install
* Modal authentication
* creating Hugging Face secret
* deploying SGLang endpoint

### `docs/huggingface_setup.md`

Must explain:

* why Hugging Face is used
* creating HF token
* storing token in Modal Secret

### `docs/litellm_setup.md`

Must explain:

* running LiteLLM
* configuring model alias
* connecting to Modal

### `docs/troubleshooting.md`

Must include common problems:

* Modal auth issues
* HF token issues
* model download slow
* GPU memory errors
* LiteLLM connection failures
* VS Code extension not appearing
* TypeScript compile errors

### `docs/cost_control.md`

Must explain:

* H200 cost awareness
* scale-down behavior
* avoiding idle GPU spend
* testing with smoke scripts
* shutting down deployments when not needed

---

## 19. Environment Variables

Root `.env.example` should include:

```env
# LiteLLM
BORGER_LITELLM_BASE_URL=http://localhost:4000/v1
BORGER_LITELLM_API_KEY=sk-private-local-key
BORGER_MODEL=qwen3-coder-next-abliterated-h200

# Borger behavior
BORGER_MODE=plan
BORGER_MAX_CONTEXT_FILES=80
BORGER_MAX_FILE_SIZE_KB=300
BORGER_CONFIRM_BEFORE_APPLY=true
BORGER_CONFIRM_BEFORE_TERMINAL=true

# Capability permissions
BORGER_PERMISSION_PROFILE=edit_with_review
BORGER_CAN_READ_WORKSPACE=true
BORGER_CAN_WRITE_WORKSPACE=true
BORGER_CAN_RUN_TERMINAL=true
BORGER_CAN_USE_GIT=true
BORGER_CAN_PUSH_GITHUB=false
BORGER_CAN_USE_SSH=false
BORGER_CAN_DEPLOY=false
BORGER_CAN_RUN_DESTRUCTIVE_COMMANDS=false
BORGER_REQUIRE_CONFIRMATION_FOR_DESTRUCTIVE=true
BORGER_REQUIRE_CONFIRMATION_FOR_GIT_PUSH=true
BORGER_REQUIRE_CONFIRMATION_FOR_SSH=true
BORGER_MAX_AUTO_FIX_LOOPS=5

# Modal/Hugging Face
HF_TOKEN=replace_with_huggingface_token
MODAL_APP_NAME=borger-qwen3-coder-next-h200
MODAL_VOLUME_NAME=borger-qwen-cache
```

Do not commit real secrets.

---

## 20. Implementation Standards

Codex must follow these standards:

1. Use TypeScript strict mode where practical.
2. Keep files modular.
3. Avoid huge files.
4. Add useful comments only where needed.
5. Do not hardcode secrets.
6. Use clear error handling.
7. Use typed interfaces for model responses.
8. Keep prompts in dedicated prompt files.
9. Keep tools separated from agent logic.
10. Ensure each phase compiles before moving to the next.
11. Update docs after every phase.
12. Stop after each phase.

---

## 21. Codex Execution Protocol

Codex must follow this exact workflow:

```text
1. Read PROJECT_SCOPE.md
2. Confirm the current phase
3. Implement only the current phase
4. Run available build/type checks
5. Update docs
6. Summarize changed files
7. List how to test
8. List known limitations
9. Stop and wait for approval before moving to next phase
```

Codex must not skip phases.

Codex must not build the entire project in one response.

Codex must not silently change the architecture.

If something is unclear, Codex should make the smallest reasonable assumption and document it.

---

## 22. First Instruction to Codex

Use this as the first prompt after adding this project scope:

```text
Read PROJECT_SCOPE.md carefully.

Start with Phase 1 only: Repository Scaffold and VS Code Extension Shell.

Implement the repo structure, root docs, VS Code extension shell, activity bar/sidebar, basic webview, settings, LiteLLM client skeleton, workspace inspection skeleton, and Plan Mode skeleton.

Do not implement auto-edit, terminal automation, patch application, or model deployment yet.

After Phase 1:
- run the available build/type checks
- update README and docs
- summarize changed files
- explain how to test in VS Code Extension Development Host
- stop and wait for approval
```

---

## 23. Definition of Done for the Whole Project

Borger is complete when:

1. The VS Code extension runs locally.
2. The Borger sidebar appears in VS Code.
3. User can configure LiteLLM endpoint/model/API key.
4. User can test model connection.
5. User can inspect workspace.
6. User can ask about current file and selected code.
7. User can request plans.
8. User can preview diffs.
9. User can apply approved edits.
10. User can run approved terminal commands.
11. User can fix errors through an iterative loop.
12. User can summarize git changes and generate commits.
13. Modal H200:2 deployment works.
14. LiteLLM routes to Modal successfully.
15. Documentation is complete.
16. Secrets are not hardcoded.
17. The system works as a private VS Code coding agent.

---

## 24. Final Product Statement

Borger is a private VS Code coding-agent extension powered by a Modal-hosted H200:2 uncensored Qwen3-Coder-Next abliterated model. It is designed to work like Codex or Claude Code inside VS Code, helping the user plan, edit, debug, test, and complete software projects with an agentic workflow.

The project must prioritize:

* VS Code-native workflow
* strong coding assistance
* repo-aware reasoning
* clear diffs
* terminal-based verification
* iterative bug fixing
* private personal-use deployment
* robust Modal H200 model serving
* phase-by-phase implementation
