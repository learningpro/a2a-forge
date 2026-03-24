import type { Result } from "../bindings";

/** Unwrap a Result — return data on ok, throw on error */
export function unwrap<T>(result: Result<T, any>): T {
  if (result.status === "ok") return result.data;
  throw result.error;
}

/** History entry type returned by list_history */
export type HistoryEntry = {
  id: string;
  agentId: string;
  skillName: string;
  requestJson: string;
  responseJson: string | null;
  status: string;
  durationMs: number | null;
  createdAt: number;
};
