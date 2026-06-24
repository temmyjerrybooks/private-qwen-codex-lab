export type BorgerMode = "ask" | "plan" | "edit" | "fix" | "auto" | "commit";

export interface BorgerTask {
  id: string;
  mode: BorgerMode;
  prompt: string;
}
