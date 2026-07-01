# Security And Privacy

Borger is designed as a private local VS Code extension, not a public SaaS product.

## Local Data

- Borger runs inside VS Code on the open workspace.
- Local runtime files live under `.borger/` and are ignored by git.
- `.borger/providers.local.json`, `.borger/permissions.local.json`, `.borger/remote-hosts.local.json`, project memory files, action logs, usage ledgers, provider state, and backups should stay local.
- Action logs may contain command metadata and authorization decisions. Keep them ignored.

## Secrets

- Do not commit provider keys, LiteLLM keys, Modal credentials, Hugging Face tokens, SSH keys, `.env` files, or private keys.
- Provider API keys and LiteLLM keys should stay in VS Code SecretStorage, local environment variables, or ignored local files.
- `.env.example` is allowed because it documents placeholders, not real credentials.
- Borger skips secret-like files and blocks obvious credential/private-key material from project memory.

## Safety Model

- Review diffs before applying edits.
- Auto Mode is disabled by default and remains loop-limited.
- Terminal, Git, GitHub, SSH, and Remote Ops use authorization checks before running.
- Remote Ops requires explicitly allowlisted hosts and allowed remote working directories.
- SSH private key contents should never be stored in the repository.
- Destructive commands, forced Git operations, broad secret reads, and unsafe remote commands are blocked by default.

## Provider Privacy

Model calls are routed through the configured provider path:

```text
Borger -> Provider Router -> LiteLLM -> Modal/SGLang
```

Only safe workspace context selected by Borger is sent to the model. Review provider configuration and budgets before sending private code to any endpoint.
