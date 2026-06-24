export interface AgentLoopResult {
  status: "not-implemented";
  message: string;
}

export function runAgentLoop(): AgentLoopResult {
  return {
    status: "not-implemented",
    message: "Auto mode is planned for a later phase."
  };
}
