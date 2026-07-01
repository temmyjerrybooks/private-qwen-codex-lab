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
