# Acceptance Criteria

## Phase 1

- `npm install` works inside `apps/vscode-extension`
- `npm run compile` works
- Pressing `F5` launches Extension Development Host
- Borger appears in the VS Code sidebar/activity bar
- `Borger: Open Agent` opens the webview
- `Borger: Inspect Workspace` returns a basic workspace summary
- `Borger: Test Model Connection` attempts a call to LiteLLM
- `Borger: Plan Task` can send a plan prompt to the model
- Extension does not perform workspace edits in Phase 1

## Phase 2

- Modal app deploys successfully
- Model begins loading from Hugging Face
- Model cache persists
- Endpoint exposes OpenAI-compatible routes
- `/v1/models` test works if supported
- `/v1/chat/completions` smoke test works
- Docs explain setup and deployment

## Phase 3

- LiteLLM starts locally
- LiteLLM exposes OpenAI-compatible endpoint
- Model alias `qwen3-coder-next-abliterated-h200` works
- Smoke test sends chat request through LiteLLM to Modal
- Borger extension can test connection through LiteLLM

Later phase acceptance criteria remain defined in `PROJECT_SCOPE.md`.
