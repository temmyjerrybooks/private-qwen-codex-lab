import { createTwoFilesPatch } from "diff";

export function buildUnifiedDiff(path: string, originalContent: string, proposedContent: string): string {
  return createTwoFilesPatch(
    `${path} (current)`,
    `${path} (proposed)`,
    normalizeLineEndings(originalContent),
    normalizeLineEndings(proposedContent),
    "",
    "",
    { context: 4 }
  ).trim();
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n");
}
