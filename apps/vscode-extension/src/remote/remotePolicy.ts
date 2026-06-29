import { classifyCommand, isObviousDestructiveCommand } from "../permissions/commandPolicy";
import { PermissionState } from "../permissions/permissionState";
import { RemotePolicyResult } from "./remoteTypes";

const blockedPatterns = [
  "rm -rf",
  "rm -fr",
  "sudo rm",
  "mkfs",
  "shutdown",
  "reboot",
  "halt",
  "poweroff",
  "userdel",
  "passwd",
  "chmod -r 777 /",
  "chmod -R 777 /",
  "chown -r",
  "chown -R",
  "git reset --hard",
  "git clean -fd",
  "git clean -df",
  "git push --force",
  "git push -f"
];

const confirmationPatterns = [
  /^npm\s+install\b/,
  /^pnpm\s+install\b/,
  /^pnpm\s+add\b/,
  /^yarn\s+install\b/,
  /^yarn\s+add\b/,
  /^pip3?\s+install\b/,
  /^docker\s+compose\s+up\b/,
  /^docker\s+compose\s+down\b/,
  /^pm2\s+restart\b/,
  /^systemctl\s+restart\b/,
  /^systemctl\s+reload\b/,
  /^modal\s+deploy\b/,
  /^git\s+pull\b/,
  /^git\s+fetch\b/,
  /^git\s+checkout\b/,
  /^git\s+merge\b/
];

const safePatterns = [
  /^pwd$/,
  /^ls(\s+(-la|-al|-l|-a))?(\s+[a-zA-Z0-9._/\-]+)*$/,
  /^git\s+status(\s+--short)?$/,
  /^git\s+branch\s+--show-current$/,
  /^git\s+log\s+--oneline\s+-5$/,
  /^cat\s+(\.\/)?package\.json$/,
  /^npm\s+run\s+(build|test|lint|typecheck|check-types|compile)$/,
  /^npm\s+test$/,
  /^docker\s+ps$/,
  /^docker\s+compose\s+ps$/,
  /^pm2\s+status$/,
  /^systemctl\s+status\s+[a-zA-Z0-9_.@\-]+$/
];

const secretReadPatterns = [
  /\bcat\s+.*(\.env|\.env\.local|secret|secrets|token|tokens|credential|credentials|id_rsa|id_ed25519|\.pem|\.key)\b/,
  /\bless\s+.*(\.env|secret|token|credential|id_rsa|id_ed25519|\.pem|\.key)\b/,
  /\bgrep\b.*(\.env|secret|token|credential|id_rsa|id_ed25519|\.pem|\.key)\b/,
  /\b(find|ls)\b.*(\.ssh|id_rsa|id_ed25519|\.pem|\.key)\b/
];

export function classifyRemoteCommand(command: string, state: PermissionState): RemotePolicyResult {
  const normalized = normalizeCommand(command);
  if (!normalized) {
    return {
      classification: "blocked",
      reason: "Empty remote command."
    };
  }

  const secretPattern = secretReadPatterns.find((pattern) => pattern.test(normalized));
  if (secretPattern) {
    return {
      classification: "blocked",
      reason: "Remote command appears to read secrets, credentials, tokens, or private keys.",
      matchedPattern: String(secretPattern),
      destructive: true
    };
  }

  const pipeToShell = /\b(curl|wget)\b.+\|\s*(sh|bash|zsh|fish)\b/.test(normalized);
  if (pipeToShell) {
    return {
      classification: "blocked",
      reason: "Remote command pipes downloaded content into a shell.",
      matchedPattern: "curl/wget | sh",
      destructive: true
    };
  }

  const blocked = blockedPatterns.find((pattern) => normalized.includes(pattern.toLowerCase()));
  if (blocked) {
    return {
      classification: "blocked",
      reason: `Remote command matches blocked pattern: ${blocked}`,
      matchedPattern: blocked,
      destructive: true
    };
  }

  if (isObviousDestructiveCommand(normalized)) {
    return {
      classification: "blocked",
      reason: "Remote command is destructive and blocked by default.",
      destructive: true
    };
  }

  const genericPolicy = classifyCommand(normalized, state);
  if (genericPolicy.classification === "blocked") {
    return {
      classification: "blocked",
      reason: genericPolicy.reason,
      matchedPattern: genericPolicy.matchedPattern,
      destructive: true
    };
  }

  const needsConfirmation = confirmationPatterns.find((pattern) => pattern.test(normalized));
  if (needsConfirmation) {
    return {
      classification: "needs_confirmation",
      reason: `Remote command requires confirmation: ${String(needsConfirmation)}`,
      matchedPattern: String(needsConfirmation)
    };
  }

  const safe = safePatterns.find((pattern) => pattern.test(normalized));
  if (safe) {
    return {
      classification: "safe",
      reason: "Remote command is in the safe read-oriented allowlist.",
      matchedPattern: String(safe)
    };
  }

  return {
    classification: "needs_confirmation",
    reason: "Remote command is not in the safe allowlist and requires confirmation."
  };
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, " ").toLowerCase();
}
