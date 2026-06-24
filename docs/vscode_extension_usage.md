# VS Code Extension Usage

## Run in Development Mode

```powershell
cd apps/vscode-extension
npm install
npm run compile
```

Open the repository in VS Code and press `F5` to launch an Extension Development Host.
The included root launch configuration uses `apps/vscode-extension` as the extension development path.

## Configure Borger

Set these values in VS Code settings:

```json
{
  "borger.litellmBaseUrl": "http://localhost:4000/v1",
  "borger.model": "qwen3-coder-next-abliterated-h200",
  "borger.mode": "plan"
}
```

API keys are stored through VS Code SecretStorage when prompted by `Borger: Test Model Connection`.

## Sidebar

Open the Borger activity bar item. The Phase 1 sidebar supports workspace inspection and plan requests. Tasks, Changes, Memory, and Settings sections exist as placeholders for later phases.

## Commands

- `Borger: Open Agent`
- `Borger: Inspect Workspace`
- `Borger: Test Model Connection`
- `Borger: Plan Task`
