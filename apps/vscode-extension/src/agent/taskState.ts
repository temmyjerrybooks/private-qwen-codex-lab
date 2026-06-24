export interface TaskState {
  id: string;
  mode: string;
  status: "planned" | "running" | "complete" | "failed";
}
