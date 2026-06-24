import { inspectWorkspace, WorkspaceSummary } from "../tools/workspace";

export async function buildWorkspaceContext(): Promise<WorkspaceSummary> {
  return inspectWorkspace();
}
