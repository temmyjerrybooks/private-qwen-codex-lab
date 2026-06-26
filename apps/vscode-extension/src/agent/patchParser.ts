import { z } from "zod";
import { isSecretPath, normalizeRelativePath } from "../tools/readFile";

export type ProposedEditAction = "create" | "modify" | "delete";

export interface ParsedEditChange {
  path: string;
  action: ProposedEditAction;
  reason: string;
  content?: string;
}

export interface ParsedEditCommand {
  command: string;
  reason: string;
}

export interface ParsedEditProposal {
  summary: string;
  changes: ParsedEditChange[];
  commandsToRunLater: ParsedEditCommand[];
  risks: string[];
}

const editChangeSchema = z
  .object({
    path: z.string().min(1),
    action: z.enum(["create", "modify", "delete"]),
    reason: z.string().min(1),
    content: z.string().optional()
  })
  .strict();

const editCommandSchema = z
  .object({
    command: z.string().min(1),
    reason: z.string().min(1)
  })
  .strict();

const editProposalSchema = z
  .object({
    summary: z.string().min(1),
    changes: z.array(editChangeSchema).min(1),
    commandsToRunLater: z.array(editCommandSchema).default([]),
    risks: z.array(z.string()).default([])
  })
  .strict();

export function parseEditProposalFromModel(rawResponse: string): ParsedEditProposal {
  const jsonText = extractJsonObject(rawResponse);
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Model edit proposal was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const result = editProposalSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; ");
    throw new Error(`Model edit proposal did not match the required shape: ${issues}`);
  }

  return {
    ...result.data,
    changes: result.data.changes.map((change) => ({
      ...change,
      path: normalizeAndValidateProposalPath(change.path, change.action)
    }))
  };
}

function extractJsonObject(rawResponse: string): string {
  const fenced = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = rawResponse.indexOf("{");
  const lastBrace = rawResponse.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Model edit proposal did not contain a JSON object.");
  }

  return rawResponse.slice(firstBrace, lastBrace + 1).trim();
}

function normalizeAndValidateProposalPath(path: string, action: ProposedEditAction): string {
  const normalized = normalizeRelativePath(path);

  if (!normalized || normalized === ".") {
    throw new Error(`Invalid ${action} path: path is empty.`);
  }
  if (normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Invalid ${action} path "${path}": paths must stay inside the workspace.`);
  }
  if (/^[a-zA-Z]:\//.test(normalized) || normalized.startsWith("/")) {
    throw new Error(`Invalid ${action} path "${path}": absolute paths are not allowed.`);
  }
  if (isSecretPath(normalized)) {
    throw new Error(`Blocked ${action} path "${normalized}": secret-like files cannot be proposed or applied by Borger.`);
  }

  return normalized;
}
