import { inspectWorkspace } from "./workspace";

export async function getBasicFileTree(): Promise<string[]> {
  const summary = await inspectWorkspace();
  return summary.sampleFiles;
}
