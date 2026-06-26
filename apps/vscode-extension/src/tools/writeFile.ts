export function writeFileUnavailable(): string {
  return "File writing is disabled in Phase 6. Proposed changes can be previewed and approved, but not applied.";
}

export function isWorkspaceFileWritingEnabled(): boolean {
  return false;
}
