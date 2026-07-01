# Borger VS Code Extension

Borger is a private VS Code coding-agent extension for repo-aware planning, reviewed code changes, safe terminal verification, Fix Mode, controlled Auto Mode, Git/GitHub workflow support, allowlisted Remote Ops, and local project memory.

## Install For Development

```powershell
npm.cmd install
npm.cmd run check-types
npm.cmd run compile
```

Press `F5` from the repository root to run an Extension Development Host.

## Package Locally

```powershell
npm.cmd run package
```

Expected output:

```text
borger-vscode-agent-0.13.0.vsix
```

This only builds a local VSIX. It does not publish to the Marketplace.

## Core Commands

- `Borger: Open Agent`
- `Borger: Inspect Workspace`
- `Borger: Test Model Connection`
- `Borger: Plan Task`
- `Borger: Generate Proposed Changes`
- `Borger: Apply Approved Changes`
- `Borger: Run Terminal Command`
- `Borger: Fix Diagnostics`
- `Borger: Run Auto Mode`
- `Borger: Git Status`
- `Borger: Show Remote Hosts`
- `Borger: Show Project Memory`
- `Borger: Show Permissions`

## Safety Defaults

Auto Mode is disabled by default. Secrets, `.borger/*.local.*` files, action logs, usage ledgers, backups, real `.env` files, private keys, tokens, and credentials must remain local and ignored by git.

See the root docs for LiteLLM/Modal setup, release checklist, VSIX packaging, and security/privacy guidance.
