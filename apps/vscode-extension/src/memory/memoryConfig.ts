import * as vscode from "vscode";
import { z } from "zod";
import { ensureBorgerDir, fileExists, getBorgerDirUri } from "../permissions/permissionConfig";
import { ProjectMemory, ProjectMemoryLoadResult, ProjectNote, ProjectNotesLoadResult } from "./memoryTypes";
import { sanitizeMemoryList, sanitizeMemoryText, sanitizeTags } from "./memoryPolicy";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const projectMemorySchema = z
  .object({
    projectName: z.string().default(""),
    summary: z.string().default(""),
    architecture: z.array(z.string()).default([]),
    importantDecisions: z.array(z.string()).default([]),
    knownLimitations: z.array(z.string()).default([]),
    preferredCommands: z.array(z.string()).default([]),
    lastUpdatedAt: z.string().default("")
  })
  .strict();

const projectNoteSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    type: z.enum(["decision", "todo", "warning", "architecture", "command", "limitation", "general"]),
    title: z.string().min(1),
    body: z.string().default(""),
    tags: z.array(z.string()).default([])
  })
  .strict();

export function getProjectMemoryUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "project-memory.local.json");
}

export function getProjectNotesUri(): vscode.Uri {
  return vscode.Uri.joinPath(getBorgerDirUri(), "project-notes.local.jsonl");
}

export async function loadProjectMemoryFile(): Promise<ProjectMemoryLoadResult> {
  const uri = getProjectMemoryUri();
  if (!(await fileExists(uri))) {
    return {
      source: "default",
      uri: uri.fsPath
    };
  }

  try {
    const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
    const parsed = projectMemorySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return {
        source: "malformed",
        uri: uri.fsPath,
        warning: parsed.error.issues.map((issue) => issue.message).join("; ")
      };
    }
    return {
      memory: sanitizeProjectMemory(parsed.data),
      source: "local",
      uri: uri.fsPath
    };
  } catch (error) {
    return {
      source: "malformed",
      uri: uri.fsPath,
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function loadProjectNotesFile(limit = 50): Promise<ProjectNotesLoadResult> {
  const uri = getProjectNotesUri();
  if (!(await fileExists(uri))) {
    return {
      notes: [],
      source: "default",
      uri: uri.fsPath
    };
  }

  try {
    const raw = decoder.decode(await vscode.workspace.fs.readFile(uri));
    const notes = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parsed = projectNoteSchema.safeParse(JSON.parse(line));
        return parsed.success ? sanitizeProjectNote(parsed.data) : undefined;
      })
      .filter((note): note is ProjectNote => Boolean(note))
      .slice(-limit)
      .reverse();
    return {
      notes,
      source: "local",
      uri: uri.fsPath
    };
  } catch (error) {
    return {
      notes: [],
      source: "malformed",
      uri: uri.fsPath,
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function writeProjectMemoryFile(memory: ProjectMemory): Promise<void> {
  await ensureBorgerDir();
  await vscode.workspace.fs.writeFile(getProjectMemoryUri(), encoder.encode(`${JSON.stringify(sanitizeProjectMemory(memory), null, 2)}\n`));
}

export async function appendProjectNoteFile(note: ProjectNote): Promise<void> {
  await ensureBorgerDir();
  const uri = getProjectNotesUri();
  const existing = (await fileExists(uri)) ? decoder.decode(await vscode.workspace.fs.readFile(uri)) : "";
  await vscode.workspace.fs.writeFile(uri, encoder.encode(`${existing}${JSON.stringify(sanitizeProjectNote(note))}\n`));
}

export async function clearProjectMemoryFiles(): Promise<void> {
  await ensureBorgerDir();
  const memoryUri = getProjectMemoryUri();
  const notesUri = getProjectNotesUri();
  if (await fileExists(memoryUri)) {
    await vscode.workspace.fs.delete(memoryUri);
  }
  if (await fileExists(notesUri)) {
    await vscode.workspace.fs.delete(notesUri);
  }
}

export function sanitizeProjectMemory(memory: ProjectMemory): ProjectMemory {
  return {
    projectName: sanitizeMemoryText(memory.projectName, 120).text,
    summary: sanitizeMemoryText(memory.summary, 1500).text,
    architecture: sanitizeMemoryList(memory.architecture, 12),
    importantDecisions: sanitizeMemoryList(memory.importantDecisions, 16),
    knownLimitations: sanitizeMemoryList(memory.knownLimitations, 16),
    preferredCommands: sanitizeMemoryList(memory.preferredCommands, 12),
    lastUpdatedAt: memory.lastUpdatedAt || new Date().toISOString()
  };
}

export function sanitizeProjectNote(note: ProjectNote): ProjectNote {
  return {
    ...note,
    title: sanitizeMemoryText(note.title, 140).text,
    body: sanitizeMemoryText(note.body, 1500).text,
    tags: sanitizeTags(note.tags)
  };
}
