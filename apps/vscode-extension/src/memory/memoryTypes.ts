export type ProjectNoteType = "decision" | "todo" | "warning" | "architecture" | "command" | "limitation" | "general";

export interface ProjectMemory {
  projectName: string;
  summary: string;
  architecture: string[];
  importantDecisions: string[];
  knownLimitations: string[];
  preferredCommands: string[];
  lastUpdatedAt: string;
}

export interface ProjectNote {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: ProjectNoteType;
  title: string;
  body: string;
  tags: string[];
}

export interface ProjectMemoryLoadResult {
  memory?: ProjectMemory;
  source: "default" | "local" | "malformed";
  uri: string;
  warning?: string;
}

export interface ProjectNotesLoadResult {
  notes: ProjectNote[];
  source: "default" | "local" | "malformed";
  uri: string;
  warning?: string;
}

export interface ProjectMemoryContext {
  available: boolean;
  summary?: string;
  architecture: string[];
  importantDecisions: string[];
  knownLimitations: string[];
  preferredCommands: string[];
  recentNotes: Array<Pick<ProjectNote, "id" | "type" | "title" | "body" | "tags" | "updatedAt">>;
  source: string;
  warning?: string;
}

export interface ProjectMemoryState {
  memory: ProjectMemoryLoadResult;
  notes: ProjectNotesLoadResult;
  context: ProjectMemoryContext;
}
