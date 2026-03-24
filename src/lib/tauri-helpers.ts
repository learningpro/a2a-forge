import type { Result } from "../bindings";

/** Unwrap a Result — return data on ok, throw on error */
export function unwrap<T>(result: Result<T, any>): T {
  if (result.status === "ok") return result.data;
  // AppError is { kind, message } — wrap in a real Error so callers get a string via .message
  const err = result.error;
  const msg =
    err && typeof err === "object" && "message" in err
      ? String(err.message)
      : typeof err === "string"
        ? err
        : JSON.stringify(err);
  throw new Error(msg);
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
