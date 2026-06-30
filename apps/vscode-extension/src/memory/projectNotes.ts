import { authorizeAction, assertAuthorized } from "../permissions/authorization";
import { logAction } from "../permissions/actionLogger";
import { appendProjectNoteFile, getProjectNotesUri, loadProjectNotesFile, sanitizeProjectNote } from "./memoryConfig";
import { assertMemoryTextAllowed, sanitizeTags } from "./memoryPolicy";
import { ProjectNote, ProjectNoteType, ProjectNotesLoadResult } from "./memoryTypes";

export async function getProjectNotes(limit = 50): Promise<ProjectNotesLoadResult> {
  return loadProjectNotesFile(limit);
}

export async function addProjectNote(input: {
  title: string;
  body: string;
  type: ProjectNoteType;
  tags?: string[];
}): Promise<ProjectNote> {
  const filePath = getProjectNotesUri().fsPath;
  const decision = await authorizeAction("create_file", { filePath });
  if (!decision.allowed) {
    await logAction({
      actionType: "project_memory_blocked",
      allowed: false,
      requiresConfirmation: decision.requiresConfirmation,
      reason: decision.reason,
      profile: decision.profile,
      filePath,
      status: "blocked"
    });
    assertAuthorized(decision);
  }

  try {
    const now = new Date().toISOString();
    const note = sanitizeProjectNote({
      id: createNoteId(),
      createdAt: now,
      updatedAt: now,
      type: input.type,
      title: assertMemoryTextAllowed(input.title, "Project note title"),
      body: assertMemoryTextAllowed(input.body, "Project note body"),
      tags: sanitizeTags(input.tags ?? [])
    });

    await appendProjectNoteFile(note);
    await logAction({
      actionType: "project_note_added",
      allowed: true,
      requiresConfirmation: decision.requiresConfirmation,
      reason: `Added project note: ${note.title}`,
      profile: decision.profile,
      filePath,
      status: "succeeded"
    });
    return note;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logAction({
      actionType: "project_memory_blocked",
      allowed: false,
      requiresConfirmation: decision.requiresConfirmation,
      reason: message,
      profile: decision.profile,
      filePath,
      status: "blocked"
    });
    throw error;
  }
}

function createNoteId(): string {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
