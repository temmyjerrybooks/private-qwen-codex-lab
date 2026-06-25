import * as vscode from "vscode";
import { isSecretPath } from "./readFile";
import { toWorkspaceRelativePath } from "./fileTree";

export interface TextRangeSummary {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

export interface SelectionContext {
  text: string;
  range: TextRangeSummary;
  truncated: boolean;
}

export interface ActiveFileContext {
  path: string;
  languageId: string;
  lineCount: number;
  text?: string;
  selection?: SelectionContext;
  skippedReason?: string;
  truncated: boolean;
}

export function getActiveSelectionText(): string | undefined {
  return getActiveEditorContext(undefined, 50)?.selection?.text;
}

export function getActiveEditorContext(
  workspaceFolder: vscode.WorkspaceFolder | undefined,
  maxFileSizeKb: number
): ActiveFileContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const document = editor.document;
  const relativePath = workspaceFolder ? toWorkspaceRelativePath(workspaceFolder, document.uri) : document.uri.fsPath;
  const selection = editor.selection.isEmpty ? undefined : editor.selection;

  if (workspaceFolder && relativePath.startsWith("..")) {
    return {
      path: relativePath,
      languageId: document.languageId,
      lineCount: document.lineCount,
      skippedReason: "outside_workspace",
      truncated: false
    };
  }

  if (isSecretPath(relativePath)) {
    return {
      path: relativePath,
      languageId: document.languageId,
      lineCount: document.lineCount,
      skippedReason: "secret_like_file",
      truncated: false
    };
  }

  const maxCharacters = Math.min(12000, Math.max(1000, maxFileSizeKb * 1024));
  const rawText = document.getText();
  const text = rawText.length > maxCharacters ? rawText.slice(0, maxCharacters) : rawText;

  return {
    path: relativePath,
    languageId: document.languageId,
    lineCount: document.lineCount,
    text,
    selection: selection ? buildSelectionContext(document, selection) : undefined,
    truncated: rawText.length > maxCharacters
  };
}

function buildSelectionContext(document: vscode.TextDocument, selection: vscode.Selection): SelectionContext {
  const rawText = document.getText(selection);
  const maxCharacters = 6000;
  return {
    text: rawText.length > maxCharacters ? rawText.slice(0, maxCharacters) : rawText,
    range: {
      startLine: selection.start.line + 1,
      startCharacter: selection.start.character + 1,
      endLine: selection.end.line + 1,
      endCharacter: selection.end.character + 1
    },
    truncated: rawText.length > maxCharacters
  };
}
