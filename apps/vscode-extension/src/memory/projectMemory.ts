import * as vscode from "vscode";
import { LiteLLMClient } from "../model/litellmClient";
import { assertAuthorized, authorizeAction } from "../permissions/authorization";
import { logAction } from "../permissions/actionLogger";
import { ProviderRouter } from "../providers/providerRouter";
import {
  clearProjectMemoryFiles,
  getProjectMemoryUri,
  getProjectNotesUri,
  loadProjectMemoryFile,
  loadProjectNotesFile,
  sanitizeProjectMemory,
  writeProjectMemoryFile
} from "./memoryConfig";
import { sanitizeMemoryText } from "./memoryPolicy";
import { ProjectMemory, ProjectMemoryContext, ProjectMemoryState } from "./memoryTypes";

export async function getProjectMemoryState(): Promise<ProjectMemoryState> {
  const [memory, notes] = await Promise.all([loadProjectMemoryFile(), loadProjectNotesFile(30)]);
  return {
    memory,
    notes,
    context: buildProjectMemoryContext(memory.memory, notes.notes, memory.source, memory.warning || notes.warning)
  };
}

export async function getSafeProjectMemoryContext(): Promise<ProjectMemoryContext> {
  const state = await getProjectMemoryState();
  return state.context;
}

export async function updateProjectSummaryFromContext(
  extensionContext: vscode.ExtensionContext,
  workspaceContext: unknown
): Promise<ProjectMemory> {
  const readDecision = await authorizeAction("read_workspace");
  assertAuthorized(readDecision);
  const writeDecision = await authorizeAction("write_file", { filePath: getProjectMemoryUri().fsPath });
  assertAuthorized(writeDecision);

  const currentState = await getProjectMemoryState();
  const router = new ProviderRouter(extensionContext);
  const selection = await router.selectProvider("project_memory");
  const client = new LiteLLMClient(
    {
      baseUrl: selection.provider.baseUrl,
      model: selection.provider.model,
      label: selection.provider.label
    },
    selection.apiKey
  );

  const startedAt = Date.now();
  try {
    const raw = await client.chat([
      {
        role: "system",
        content:
          "You update local project memory for a private VS Code coding agent. Return only safe project context. Never include secrets, tokens, credentials, private keys, .env contents, or runtime logs."
      },
      {
        role: "user",
        content: buildProjectSummaryPrompt(workspaceContext, currentState)
      }
    ]);
    const memory = parseProjectMemoryResponse(raw, getWorkspaceName(workspaceContext));
    await writeProjectMemoryFile(memory);
    await router.recordRequest(selection, "project_memory", Date.now() - startedAt, true);
    await logAction({
      actionType: "project_summary_updated",
      allowed: true,
      requiresConfirmation: writeDecision.requiresConfirmation,
      reason: "Updated local project memory summary through provider router.",
      profile: writeDecision.profile,
      filePath: getProjectMemoryUri().fsPath,
      status: "succeeded"
    });
    return memory;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await router.recordRequest(selection, "project_memory", Date.now() - startedAt, false, message);
    await logAction({
      actionType: "project_memory_blocked",
      allowed: false,
      requiresConfirmation: writeDecision.requiresConfirmation,
      reason: message,
      profile: writeDecision.profile,
      filePath: getProjectMemoryUri().fsPath,
      status: "failed"
    });
    throw error;
  }
}

export async function clearProjectMemory(): Promise<void> {
  const memoryPath = getProjectMemoryUri().fsPath;
  const notesPath = getProjectNotesUri().fsPath;
  const memoryDecision = await authorizeAction("delete_file", { filePath: memoryPath });
  assertAuthorized(memoryDecision);
  const notesDecision = await authorizeAction("delete_file", { filePath: notesPath });
  assertAuthorized(notesDecision);

  const choice = await vscode.window.showWarningMessage(
    "Clear Borger project memory and project notes for this workspace? This only clears .borger/project-memory.local.json and .borger/project-notes.local.jsonl.",
    { modal: true },
    "Clear Project Memory"
  );
  if (choice !== "Clear Project Memory") {
    await logAction({
      actionType: "project_memory_blocked",
      allowed: false,
      requiresConfirmation: true,
      reason: "User cancelled project memory clear.",
      profile: memoryDecision.profile,
      status: "cancelled"
    });
    return;
  }

  await clearProjectMemoryFiles();
  await logAction({
    actionType: "project_memory_cleared",
    allowed: true,
    requiresConfirmation: true,
    reason: "Cleared local project memory and notes.",
    profile: memoryDecision.profile,
    filePath: `${memoryPath}; ${notesPath}`,
    status: "succeeded"
  });
}

export function buildProjectMemoryContext(
  memory: ProjectMemory | undefined,
  notes: ProjectMemoryState["notes"]["notes"],
  source: string,
  warning?: string
): ProjectMemoryContext {
  const hasMemoryContent = Boolean(
    memory?.summary ||
      memory?.architecture.length ||
      memory?.importantDecisions.length ||
      memory?.knownLimitations.length ||
      memory?.preferredCommands.length
  );
  return {
    available: hasMemoryContent || notes.length > 0,
    summary: memory?.summary,
    architecture: memory?.architecture.slice(0, 8) ?? [],
    importantDecisions: memory?.importantDecisions.slice(0, 10) ?? [],
    knownLimitations: memory?.knownLimitations.slice(0, 10) ?? [],
    preferredCommands: memory?.preferredCommands.slice(0, 10) ?? [],
    recentNotes: notes.slice(0, 8).map((note) => ({
      id: note.id,
      type: note.type,
      title: note.title,
      body: sanitizeMemoryText(note.body, 500).text,
      tags: note.tags,
      updatedAt: note.updatedAt
    })),
    source,
    warning
  };
}

function buildProjectSummaryPrompt(workspaceContext: unknown, state: ProjectMemoryState): string {
  return `Update Borger's local project memory from the safe workspace context and existing project notes.
Return only a strict JSON object. Do not include Markdown fences or prose.
Do not include secrets, .env contents, tokens, credentials, private keys, action logs, provider secrets, or remote-host secrets.
Keep every list concise and useful for future planning, fixing, and Auto Mode.

Existing safe memory context:
${JSON.stringify(state.context, null, 2)}

Workspace context:
${JSON.stringify(workspaceContext, null, 2)}

Required JSON shape:
{
  "projectName": "Project name",
  "summary": "Short project summary",
  "architecture": ["important architecture fact"],
  "importantDecisions": ["decision worth remembering"],
  "knownLimitations": ["limitation worth remembering"],
  "preferredCommands": ["npm.cmd run check-types"],
  "lastUpdatedAt": "ISO timestamp"
}`;
}

function parseProjectMemoryResponse(raw: string, fallbackProjectName: string): ProjectMemory {
  const json = extractJson(raw);
  const parsed = JSON.parse(json) as Partial<ProjectMemory>;
  return sanitizeProjectMemory({
    projectName: parsed.projectName || fallbackProjectName,
    summary: parsed.summary || "",
    architecture: Array.isArray(parsed.architecture) ? parsed.architecture : [],
    importantDecisions: Array.isArray(parsed.importantDecisions) ? parsed.importantDecisions : [],
    knownLimitations: Array.isArray(parsed.knownLimitations) ? parsed.knownLimitations : [],
    preferredCommands: Array.isArray(parsed.preferredCommands) ? parsed.preferredCommands : [],
    lastUpdatedAt: new Date().toISOString()
  });
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? raw).trim();
}

function getWorkspaceName(value: unknown): string {
  if (value && typeof value === "object" && "workspaceName" in value) {
    return String((value as { workspaceName?: unknown }).workspaceName || "Project");
  }
  return vscode.workspace.workspaceFolders?.[0]?.name ?? "Project";
}
