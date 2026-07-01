# Phase 14 QA Report

Date: 2026-07-01

## VSIX Build Result

| Check | Result | Notes |
| --- | --- | --- |
| `npm.cmd run check-types` | Pass | TypeScript strict check completed. |
| `npm.cmd run compile` | Pass | TypeScript emit completed and copied webview CSS into `dist/webview/styles.css`. |
| `npm.cmd run package` | Pass | VSIX generated successfully. |
| VSIX install | Pass | `code --install-extension borger-vscode-agent-0.13.0.vsix --force` installed successfully. |
| Installed extension listed | Pass | `temmyjerrybooks.borger-vscode-agent@0.13.0` appears in `code --list-extensions --show-versions`. |

VSIX file:

```text
apps/vscode-extension/borger-vscode-agent-0.13.0.vsix
```

Package size:

```text
4,579,229 bytes
```

Installed extension footprint observed under `.vscode/extensions`:

```text
16,577,699 bytes across 3,194 files
```

## Install Command Tested

```powershell
cd apps/vscode-extension
code --install-extension borger-vscode-agent-0.13.0.vsix --force
```

VS Code CLI emitted a `url.parse()` deprecation warning and a crashpad/log-folder permission warning in this managed environment, but the extension install succeeded.

## Command Palette Smoke Coverage

The managed CLI environment does not expose a reliable non-interactive way to click Command Palette commands and inspect VS Code notifications. Phase 14 therefore performed packaged-command smoke checks by validating that all contributed commands have activation events and all command IDs appear in compiled `dist` output. Manual Extension Host command execution remains part of the release checklist.

| Command | Smoke Result | Notes |
| --- | --- | --- |
| `Borger: Inspect Workspace` | Packaged | Requires Extension Host UI for full runtime check. |
| `Borger: Show Permissions` | Packaged | Should work without provider setup. |
| `Borger: Plan Task` | Packaged, external dependency | Requires provider/LiteLLM for model response; should fail clearly when unavailable. |
| `Borger: Generate Proposed Changes` | Packaged, external dependency | Requires provider/LiteLLM. |
| `Borger: Show Pending Changes` | Packaged | Empty-state path expected when no pending diffs exist. |
| `Borger: Clear Pending Changes` | Packaged | Empty-state path expected when no pending diffs exist. |
| `Borger: Run Terminal Command` | Packaged, confirmation path | Requires interactive command input/confirmation. |
| `Borger: Show Command History` | Packaged | Empty-state path expected at session start. |
| `Borger: Fix Diagnostics` | Packaged, external dependency | Requires diagnostics and provider for a repair proposal; should report no diagnostics/provider clearly. |
| `Borger: Explain Last Error` | Packaged, external dependency | Should report missing failed command/provider clearly. |
| `Borger: Run Auto Mode` | Packaged, disabled by default | Should refuse unless Auto Mode is deliberately enabled. |
| `Borger: Git Status` | Packaged | Requires git workspace; should fail clearly outside git. |
| `Borger: Show Remote Hosts` | Packaged | Creates/opens ignored local remote config when missing. |
| `Borger: Show Project Memory` | Packaged | Handles missing memory files by showing empty memory state. |

Command registration checks:

```text
50 contributed commands
0 missing activation events
0 missing command IDs in compiled dist output
```

## Sidebar And Webview QA

| Area | Result | Notes |
| --- | --- | --- |
| Packaged webview JS | Pass | `dist/webview/main.js` exists in package/install. |
| Packaged webview CSS | Pass | `dist/webview/styles.css` exists in package/install. |
| Raw `src` dependency | Pass | Installed package no longer needs or includes `src/webview/styles.css`. |
| Empty-state copy | Pass | Phase 13/14 copy polish remains in place. |
| Full visual sidebar click test | Manual follow-up | Requires interactive VS Code Extension Host. |

## Safety QA

| Protected item | Result |
| --- | --- |
| Generated VSIX ignored | Pass |
| `.env` ignored | Pass |
| `.env.local` ignored | Pass |
| `.borger/action-log.jsonl` ignored | Pass |
| `.borger/providers.local.json` ignored | Pass |
| `.borger/remote-hosts.local.json` ignored | Pass |
| `.borger/project-memory.local.json` ignored | Pass |
| `.borger/project-notes.local.jsonl` ignored | Pass |
| `.borger/backups/` ignored | Pass |
| VS Code CLI `debug.log` ignored | Pass |
| `.env.example` remains trackable | Pass |
| Auto Mode default disabled | Pass |

## Issues Found And Fixes Made

| Issue | Fix |
| --- | --- |
| VSIX packaged `src/webview/styles.css` because the webview loaded CSS from `src`. | Build now copies `src/webview/styles.css` to `dist/webview/styles.css`, `AgentPanel` loads CSS from `dist`, and `.vscodeignore` excludes `src/**`. |
| VS Code CLI checks generated a local `debug.log` containing crashpad permission warnings. | Removed the generated file and added `debug.log` to `.gitignore`. |
| Attempted full esbuild bundling failed under the managed Windows sandbox because esbuild tried to read above the allowed workspace while resolving entry points/imports. | Reverted to stable TypeScript emit and documented dependency bundling as a remaining optimization. |

## Known Remaining Issues

- `vsce` still warns that the package contains many JavaScript dependency files. Full bundling should be revisited in a less restricted local environment.
- GUI command-palette and sidebar behavior still need a human Extension Host pass before any broader release.
- Provider, LiteLLM, Modal, SSH, and GitHub flows require their respective local services/auth/config to be available for true end-to-end validation.

## Recommended Next Phase

Phase 15 should focus on a real interactive Extension Host QA pass, provider-backed command execution, and bundling/dependency trimming in an unrestricted local environment.
