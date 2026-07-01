# Release Checklist

Use this checklist before sharing or installing a local Borger VSIX.

## Local QA

```powershell
git status --short
cd apps/vscode-extension
npm.cmd install
npm.cmd run check-types
npm.cmd run compile
npm.cmd run package
```

Expected output: a `.vsix` file in `apps/vscode-extension`.

Confirm the generated package:

```powershell
Get-Item .\borger-vscode-agent-0.13.0.vsix
code --install-extension .\borger-vscode-agent-0.13.0.vsix --force
code --list-extensions --show-versions | Select-String borger
```

## Extension Host Checks

1. Open the repository in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Run `Borger: Inspect Workspace`.
4. Run `Borger: Show Permissions`.
5. Run `Borger: Plan Task`.
6. Test `Generate Proposed Changes` on a safe sample task.
7. Review a diff and apply only an approved safe sample change.
8. Run `Borger: Run Terminal Command` with `git status`.
9. Run `Borger: Git Status`.
10. Run `Borger: Show Project Memory`.
11. Run `Borger: Show Pending Changes` and confirm the empty state is clear.
12. Run `Borger: Show Command History` and confirm the empty state is clear.
13. Run `Borger: Show Remote Hosts` and confirm missing config is handled safely.
14. Run `Borger: Run Auto Mode` with default settings and confirm it refuses because Auto Mode is disabled.

## Safety Checks

1. Confirm `.borger/*.local.json`, `.borger/*.local.jsonl`, action logs, usage ledgers, provider state, and backups are not staged.
2. Confirm real `.env` files, private keys, tokens, and credential files are not staged.
3. Confirm `.env.example` remains safe documentation only.
4. Confirm Auto Mode is disabled unless deliberately enabled.
5. Confirm README and docs match the current commands.

## Install The VSIX Locally

```powershell
code --install-extension apps/vscode-extension/borger-vscode-agent-0.13.0.vsix
```

If the file name changes, use the generated `.vsix` path from `npm.cmd run package`.

## Phase 14 Notes

Phase 14 verified that the VSIX installs locally and that all contributed commands have activation events and compiled command IDs. A full click-through of every command still requires an interactive VS Code Extension Host with any needed provider, LiteLLM, SSH, and GitHub configuration.
