# Troubleshooting

## VS Code Extension Not Appearing

- Run `npm install`
- Run `npm run compile`
- Press `F5` from VS Code with the extension project open

## TypeScript Compile Errors

- Confirm Node.js and npm are installed
- Reinstall dependencies inside `apps/vscode-extension`
- Run `npm.cmd run check-types` before `npm.cmd run compile` when you want a narrower TypeScript failure.

## VSIX Packaging Issues

- Run packaging from `apps/vscode-extension`.
- Confirm dependencies are installed with `npm.cmd install`.
- Confirm `npm.cmd run check-types` and `npm.cmd run compile` pass first.
- If `vsce` is missing, reinstall dependencies; the repo uses project-local `@vscode/vsce`.
- If packaging warns about ignored files, check `apps/vscode-extension/.vscodeignore`.
- If the generated file name differs, install the `.vsix` produced by `npm.cmd run package`.
- Generated `.vsix` files are ignored by git.
- If `vsce` warns about many JavaScript files, that is a packaging-size warning. The current package still ships runtime dependencies because full bundling needs separate QA.
- If `code --install-extension` prints a crashpad, log-folder, or `url.parse()` warning but reports the extension was installed, treat the install as successful and confirm with `code --list-extensions --show-versions | Select-String borger`.
- If the sidebar opens without styling, rerun `npm.cmd run compile` and confirm `dist/webview/styles.css` exists.

## LiteLLM Connection Failures

- Confirm LiteLLM is running:

```powershell
docker compose -f infra/docker/docker-compose.litellm.yml up
```

- Confirm Borger and smoke tests use the local base URL:

```text
http://localhost:4000/v1
```

- Confirm `BORGER_LITELLM_API_KEY` matches `LITELLM_MASTER_KEY`.
- Confirm the model alias matches `qwen3-coder-next-abliterated-h200`.
- If `/v1/models` works but chat fails, check `BORGER_MODAL_API_BASE`.
- If you see 401 or 403, the LiteLLM master key is probably wrong.
- If you see 404, check the model alias and `/v1` suffix.
- If you see 502, 503, or 504, the Modal endpoint may be sleeping or SGLang may still be loading.

## Permission Issues

- Run `Borger: Show Permissions` to inspect the active profile.
- If workspace inspection or planning is blocked, confirm `canReadWorkspace` is true.
- If `.borger/permissions.local.json` is malformed, Borger falls back to safe defaults and reports a warning.
- If command policy blocks a command, check `blockedCommandPatterns` and `allowedCommands`.
- Authorization decisions are logged to `.borger/action-log.jsonl`, which is ignored by git.

## Workspace Context Issues

- If `Borger: Inspect Workspace` shows no workspace, open a folder in VS Code instead of a single file.
- If expected files are missing from context, check `.gitignore`, `borger.maxContextFiles`, and the always-ignored folder list.
- If a file is skipped, it may be over `borger.maxFileSizeKb`, binary, outside the workspace, or secret-like.
- `.env.example` is intentionally allowed, but `.env`, `.env.local`, private keys, token files, and credential files are skipped.
- If git status is unavailable, confirm the workspace is a git repository and that the permission profile allows workspace or git inspection.
- If diagnostics are empty, make sure the relevant VS Code language extension has finished loading.

## Plan Mode Issues

- If Plan Task is blocked, run `Borger: Show Permissions` and confirm `canReadWorkspace` is enabled.
- If Plan Task reports no provider, run `Borger: Show Provider Status` and check budget thresholds or paused providers.
- If relevant files look weak, open or select the file related to the task before planning.
- If the model gives vague output, rerun with a more specific task and inspect the workspace first.
- If commands appear in the plan, remember they are recommendations only until you manually run one through Phase 8 terminal execution.

## Diff Preview and Safe Apply Issues

- If proposed changes fail to parse, the model likely returned malformed JSON. Regenerate with a narrower task.
- If a pending change is invalid, check whether the path escapes the workspace, targets a secret-like file, or tries to modify a missing file.
- If a create action is invalid, the file may already exist and should be proposed as `modify`.
- If approve is blocked, run `Borger: Show Permissions` and confirm the relevant create/write/delete capability is allowed.
- If apply is blocked, confirm `apply_patch` and the file action (`create_file` or `write_file`) are allowed by the active permission profile.
- If a change fails during apply, check the file card for `failed` status and the output channel for the readable error.
- If `.borger/backups/` is missing, apply a modify change first. Backups are created only when Borger writes.
- If `Borger: Revert Last Apply` refuses a backup, the last backup may be for a created file. Phase 7 does not delete files automatically.
- If a file is blocked as secret-like, rename or handle it manually. `.env.example` is allowed, but `.env`, private keys, token files, and credential files are blocked.
- If content is blocked as binary, Borger detected null bytes or binary-looking control characters and will not write it.
- If commands are listed under pending changes, they are suggestions for later verification only. Phase 8 lets you run them manually; Borger never runs them automatically after apply.
- If generated diffs are too large, reduce the task scope or lower the number of files the model should modify.

## Terminal Execution Issues

- If a command is blocked, run `Borger: Show Permissions` and check `canRunTerminal`, `allowedCommands`, and `blockedCommandPatterns`.
- If Borger asks for confirmation on safe commands, check `borger.confirmBeforeTerminal` and the active permission profile. `edit_with_review` is intentionally conservative.
- If a command exits nonzero, inspect stderr/stdout in the Terminal section or `Borger: Show Command History`.
- If output is missing in interactive mode, rerun in captured mode. Interactive mode sends the command to a VS Code terminal and cannot reliably capture output.
- If a command appears to run in the wrong folder, confirm the open VS Code folder is the intended workspace root. Phase 8 always uses the open workspace root as cwd.
- If a command using `cd ..`, `.git` deletion, `rm -rf`, forced git push, shutdown, or recursive forced deletion is blocked, that is expected default policy.
- If `git push` is blocked from the generic terminal runner, use the dedicated Phase 11 Git workflow so Borger can apply Git-specific authorization and confirmation.
- If command history is empty after reloading VS Code, that is expected. Phase 8 command history is in-memory for the current session.
- Command authorization and lifecycle events are logged to `.borger/action-log.jsonl`.

## Fix Mode Issues

- If Fix Diagnostics reports no diagnostics, wait for the relevant VS Code language extension to finish or run a build/typecheck command manually.
- If Fix Last Failed Command reports no failed command, run the failing command through Borger captured terminal execution first.
- If Fix Current File cannot run, open a file inside the workspace and make sure it is not skipped as too large, binary, outside the workspace, or secret-like.
- If Fix Mode is blocked, run `Borger: Show Permissions` and confirm `canReadWorkspace` is enabled.
- If no provider is available, run `Borger: Show Provider Status` and check paused providers, budget thresholds, or missing API keys.
- If a fix proposal creates invalid pending changes, inspect the file card reason. Secret-like files, path escapes, missing modify targets, and duplicate create targets are blocked.
- If suggested verification commands appear, run them manually. Fix Mode does not rerun commands automatically.
- If Explain Last Error creates no pending changes, that is expected. It is explanation-only.

## Auto Mode Issues

- If Auto Mode refuses to start, confirm `borger.autoModeEnabled` is true or `BORGER_AUTO_MODE_ENABLED=true`.
- If Auto Mode stops after planning, check the active permission profile. `read_only` and `plan_only` do not allow edits or commands.
- If Auto Mode waits for approval, review pending diffs and approve or reject them in the sidebar.
- If Auto Mode cannot run a verification command, confirm it is listed in `borger.autoAllowedVerificationCommands` or `BORGER_AUTO_ALLOWED_VERIFICATION_COMMANDS`.
- If a command is blocked, check `Borger: Show Permissions` and the command policy. Auto Mode uses the same terminal authorization as manual commands.
- If no provider is available or budget is paused, run `Borger: Show Provider Status`.
- If the model returns malformed JSON, Auto Mode stops with a failed summary. Rerun with a narrower task or use Fix Mode manually.
- If max loops are reached, inspect the latest command output, diagnostics, and pending changes before continuing manually.
- If Auto Mode stops on a secret-like file, handle that file manually. `.env.example` is allowed; real credential files are blocked.

## Git and GitHub Workflow Issues

- If `Borger: Git Status` fails, confirm the workspace folder is a git repository and that `git` is available on PATH.
- If Git status is blocked, run `Borger: Show Permissions` and confirm the active profile allows `git_status`.
- If staging is blocked, confirm the active profile allows `git_commit` and `run_terminal`.
- If a file is skipped during staging, it may be protected local state, a log/ledger, `.borger/backups/`, a real `.env` file, a private key, a token file, or another credential-like file. `.env.example` is allowed.
- If commit message generation fails, check provider availability, provider budget state, LiteLLM connectivity, and the current staged/unstaged diff size. You can enter a commit message manually.
- If commit creation says no staged changes exist, stage files first and rerun `Borger: Git Status`.
- If push is blocked, confirm the active profile allows `git_push`, the command policy permits non-forced push, and the branch has a valid remote.
- If push authentication fails, fix Git credentials outside Borger and retry.
- If PR creation fails because `gh` is missing, install GitHub CLI or use the manual PR title/body printed by Borger.
- If `gh pr create` fails with authentication errors, run `gh auth status` or `gh auth login` outside Borger.
- Force push, hard reset, rebase, branch deletion, and git clean are blocked by default.

## Remote Ops Issues

- If `Borger: Show Remote Hosts` opens a disabled example, edit `.borger/remote-hosts.local.json`, add your authorized host, and set `enabled` to true only after review.
- If the remote config is ignored by git, that is expected. It can contain hostnames, usernames, cwd paths, and optional private key paths.
- If `Borger: Test SSH Connection` is blocked, run `Borger: Show Permissions` and confirm `canUseSSH` is true. The `remote_ops` profile is intended for SSH workflows.
- If the host is blocked, confirm it is present and enabled in `.borger/remote-hosts.local.json`.
- If the cwd is blocked, confirm the requested remote cwd is inside one of the host's `allowedRemoteCwds`.
- If SSH auth fails, verify your local `ssh-agent`, SSH config, username, host, port, and network access outside Borger first.
- If a command is blocked, check the Remote Ops policy. Secret reads, destructive commands, forced git operations, shutdown/reboot, broad ownership/permission changes, and `curl`/`wget` piped to a shell are blocked.
- If Borger asks for confirmation, the command is risky, the SSH profile requires confirmation, or local `ssh` transport requires terminal confirmation.
- If `Inspect Remote Project` reports failures for optional files, that can be normal when `package.json`, Docker files, or PM2 config files are absent.
- If output is too large or truncated, rerun a narrower read-only command.
- Remote history is in memory for the current VS Code session. Remote authorization and lifecycle events are logged to `.borger/action-log.jsonl`.

## Project Memory Issues

- If memory does not appear, run `Borger: Show Project Memory` and confirm `.borger/project-memory.local.json` or `.borger/project-notes.local.jsonl` exists.
- If adding a note is blocked, check `Borger: Show Permissions` and confirm workspace write permissions are enabled.
- If a note is blocked by memory policy, remove secrets, private keys, tokens, credentials, or `.env` contents from the note.
- If secret-like text is redacted, that is expected. Memory is meant for durable project context, not credential storage.
- If `Update Project Summary` fails, check provider availability, provider budget status, LiteLLM connectivity, and `read_workspace` permission.
- If memory files are malformed, clear them with `Borger: Clear Project Memory` or edit the ignored local files manually.
- If Plan/Fix/Auto Mode seems to use stale context, update the project summary or clear outdated notes.
- Memory files are ignored by git. Do not force-add `.borger/project-memory.local.json` or `.borger/project-notes.local.jsonl`.

## Modal and Hugging Face Issues

- Wrong Modal endpoint: copy the URL printed by `modal deploy infra/modal/modal_qwen_h200_sglang.py` and add `/v1` for LiteLLM.
- Slow first request: the H200 app may be cold-starting, downloading weights, or reading the cache volume.
- GPU memory errors: confirm the Modal deployment uses `gpu="H200:2"` and tensor parallelism size 2.
- Endpoint failures: test Modal directly with `python scripts/smoke_test_modal_endpoint.py`, then test LiteLLM with `python scripts/smoke_test_litellm.py`.
- Hugging Face errors: confirm Modal secret `huggingface-secret` contains `HF_TOKEN`.
