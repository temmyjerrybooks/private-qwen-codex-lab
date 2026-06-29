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
  "rm -fr",
  "git reset --hard",
  "git push --force",
  "git push -f",
  "git clean -fd",
  "git clean -df",
  "git checkout -- .",
  "git branch -d",
  "git branch -D",
  "git rebase",
  "git reflog expire",
  "format",
  "shutdown",
  "del /s",
  "erase /s",
  "rmdir /s",
  "rd /s",
  "remove-item -recurse -force",
  "remove-item -force -recurse",
  "remove-item .git -recurse",
  "remove-item .git -force",
  "rm -rf .git",
  "rm -rf .",
  "rm -rf *",
  "del /s .git",
  "rmdir /s .git",
  "rd /s .git"
];

const confirmationPatterns = [
  "npm install",
  "pnpm install",
  "pnpm add",
  "yarn add",
  "yarn install",
  "pip install",
  "pip3 install",
  "git commit",
  "git push",
  "modal deploy",
  "modal app stop",
  "docker compose up",
  "docker compose down",
  "docker run",
  "prisma migrate",
  "knex migrate",
  "sequelize db:migrate",
  "db:migrate",
  "migrate",
  "--force"
];

const workspaceEscapePatterns = [
  "cd ..",
  "cd /",
  "cd \\",
  "pushd ..",
  "set-location ..",
  "sl ..",
  "--prefix ..",
  "--cwd .."
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

  const escapesWorkspace = workspaceEscapePatterns.find((pattern) => normalized.includes(pattern));
  if (escapesWorkspace) {
    return {
      classification: "blocked",
      reason: `Command attempts to change execution outside the workspace: ${escapesWorkspace}`,
      matchedPattern: escapesWorkspace,
      commandName: getCommandName(normalized)
    };
  }

  const commandName = getCommandName(normalized);
  if (commandName === "git") {
    const gitPolicy = classifyGitCommand(normalized, state);
    if (gitPolicy) {
      return gitPolicy;
    }
  }

  if (commandName === "modal" && normalized.startsWith("modal deploy") && !state.capabilities.canDeploy) {
    return {
      classification: "blocked",
      reason: "Current permission profile cannot deploy.",
      commandName
    };
  }

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
  if (first === "pip3") {
    return "pip";
  }
  return first.replace(/\.(cmd|exe|ps1)$/i, "");
}

function classifyGitCommand(command: string, state: PermissionState): CommandPolicyResult | undefined {
  if (isReadOnlyGitInspectionCommand(command)) {
    if (!state.capabilities.canUseGit && !state.capabilities.canReadWorkspace) {
      return {
        classification: "blocked",
        reason: "Current permission profile cannot inspect git state.",
        commandName: "git"
      };
    }
    return undefined;
  }

  if (/^git\s+commit\b/.test(command)) {
    if (!state.capabilities.canUseGit || !state.capabilities.canWriteWorkspace) {
      return {
        classification: "blocked",
        reason: "Current permission profile cannot perform git commits.",
        commandName: "git"
      };
    }
    return {
      classification: "needs_confirmation",
      reason: "Git commit requires confirmation.",
      matchedPattern: "git commit",
      commandName: "git"
    };
  }

  if (/^git\s+push\b/.test(command)) {
    if (!state.capabilities.canPushGitHub) {
      return {
        classification: "blocked",
        reason: "Current permission profile cannot push to GitHub.",
        commandName: "git"
      };
    }
    return {
      classification: "needs_confirmation",
      reason: "Git push requires confirmation.",
      matchedPattern: "git push",
      commandName: "git"
    };
  }

  return undefined;
}

export function isReadOnlyGitInspectionCommand(command: string): boolean {
  const normalized = normalizeCommand(command);
  return /^git\s+(status|diff|branch\s+--show-current|remote\s+get-url|rev-parse)\b/.test(normalized);
}
