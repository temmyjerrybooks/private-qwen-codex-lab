import { PermissionState } from "./permissionState";

export type CommandPolicyClassification = "safe" | "needs_confirmation" | "blocked";

export interface CommandPolicyResult {
  classification: CommandPolicyClassification;
  reason: string;
  matchedPattern?: string;
  commandName?: string;
}

const destructivePatterns = [
  "rm -rf",
  "git reset --hard",
  "git push --force",
  "format",
  "shutdown",
  "del /s",
  "remove-item -recurse -force"
];

const confirmationPatterns = [
  "npm install",
  "pnpm install",
  "yarn add",
  "pip install",
  "git commit",
  "git push",
  "modal deploy",
  "docker compose up",
  "docker run"
];

export function classifyCommand(command: string, state: PermissionState): CommandPolicyResult {
  const normalized = normalizeCommand(command);
  if (!normalized) {
    return {
      classification: "blocked",
      reason: "Empty command."
    };
  }

  const blocked = [...state.blockedCommandPatterns, ...destructivePatterns].find((pattern) =>
    normalized.includes(pattern.toLowerCase())
  );
  if (blocked) {
    return {
      classification: "blocked",
      reason: `Command matches blocked pattern: ${blocked}`,
      matchedPattern: blocked,
      commandName: getCommandName(normalized)
    };
  }

  const commandName = getCommandName(normalized);
  if (!state.allowedCommands.map((value) => value.toLowerCase()).includes(commandName)) {
    return {
      classification: "needs_confirmation",
      reason: `Command '${commandName}' is not in the allowed command list.`,
      commandName
    };
  }

  const needsConfirmation = confirmationPatterns.find((pattern) => normalized.includes(pattern));
  if (needsConfirmation) {
    return {
      classification: "needs_confirmation",
      reason: `Command matches confirmation pattern: ${needsConfirmation}`,
      matchedPattern: needsConfirmation,
      commandName
    };
  }

  return {
    classification: "safe",
    reason: `Command '${commandName}' is allowed by policy.`,
    commandName
  };
}

export function isObviousDestructiveCommand(command: string): boolean {
  const normalized = normalizeCommand(command);
  return destructivePatterns.some((pattern) => normalized.includes(pattern));
}

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, " ").toLowerCase();
}

function getCommandName(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return "";
  }
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (first === "python3") {
    return "python";
  }
  return first.replace(/\.(cmd|exe|ps1)$/i, "");
}
