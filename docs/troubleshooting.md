# Troubleshooting

## VS Code Extension Not Appearing

- Run `npm install`
- Run `npm run compile`
- Press `F5` from VS Code with the extension project open

## TypeScript Compile Errors

- Confirm Node.js and npm are installed
- Reinstall dependencies inside `apps/vscode-extension`

## LiteLLM Connection Failures

- Confirm LiteLLM is running at the configured base URL
- Confirm the API key is stored correctly
- Confirm the model alias matches `qwen3-coder-next-abliterated-h200`

## Permission Issues

- Run `Borger: Show Permissions` to inspect the active profile.
- If workspace inspection or planning is blocked, confirm `canReadWorkspace` is true.
- If `.borger/permissions.local.json` is malformed, Borger falls back to safe defaults and reports a warning.
- If command policy blocks a command, check `blockedCommandPatterns` and `allowedCommands`.
- Authorization decisions are logged to `.borger/action-log.jsonl`, which is ignored by git.

## Modal and Hugging Face Issues

Modal auth, Hugging Face tokens, slow downloads, and GPU memory issues are addressed in later deployment phases.
