import { ProjectMemoryState, ProjectNote } from "./memoryTypes";

export function formatProjectMemoryStateForOutput(state: ProjectMemoryState): string {
  const memory = state.memory.memory;
  const notes = state.notes.notes;
  const recentNotes = notes.slice(0, 12).map(formatNoteLine).join("\n");

  return [
    "Borger Project Memory",
    `Memory file: ${state.memory.uri}`,
    `Notes file: ${state.notes.uri}`,
    `Memory source: ${state.memory.source}${state.memory.warning ? ` (${state.memory.warning})` : ""}`,
    `Notes source: ${state.notes.source}${state.notes.warning ? ` (${state.notes.warning})` : ""}`,
    "",
    "Summary:",
    memory?.summary || "No project summary saved yet.",
    "",
    "Architecture:",
    formatList(memory?.architecture ?? []),
    "",
    "Important Decisions:",
    formatList(memory?.importantDecisions ?? []),
    "",
    "Known Limitations:",
    formatList(memory?.knownLimitations ?? []),
    "",
    "Preferred Commands:",
    formatList(memory?.preferredCommands ?? []),
    "",
    "Recent Notes:",
    recentNotes || "No project notes saved yet."
  ].join("\n");
}

export function formatProjectNoteForOutput(note: ProjectNote): string {
  return [
    `Project note: ${note.title}`,
    `Type: ${note.type}`,
    `Tags: ${note.tags.join(", ") || "none"}`,
    `Created: ${note.createdAt}`,
    "",
    note.body || "No note body."
  ].join("\n");
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- none";
}

function formatNoteLine(note: ProjectNote): string {
  return `- [${note.type}] ${note.title}${note.tags.length > 0 ? ` (${note.tags.join(", ")})` : ""}`;
}
