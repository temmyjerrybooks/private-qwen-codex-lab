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
- `Borger: Manage Providers`
- `Borger: Check Provider Budgets`
- `Borger: Switch Provider`
- `Borger: Show Provider Status`
- `Borger: Reset Provider State`

## Provider Routing

Phase 2.5 routes model calls through a local provider pool before calling any OpenAI-compatible endpoint.

Run:

```text
Borger: Manage Providers
```

This opens `.borger/providers.local.json`, which is ignored by git.

Provider API keys should be stored in VS Code SecretStorage. Use provider-specific secret keys such as:

```text
borger.provider.temmy.apiKey
```

Before `Borger: Test Model Connection` or `Borger: Plan Task`, Borger:

1. loads enabled providers
2. applies monthly reset logic without calling endpoints
3. calculates estimated budget usage
4. pauses providers at or above the stop threshold
5. picks the best eligible provider automatically

If every provider is paused, failed, disabled, or over budget, the model call is blocked with a clear error.

Monthly reset uses lazy activation by default. A renewed provider does not consume Modal credit until a real task or manual connection test calls it.
