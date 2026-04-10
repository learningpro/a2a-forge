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

/** History entry — mirrors Rust HistoryEntry in a2a/types.rs */
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

/** Saved test — mirrors Rust SavedTest in a2a/types.rs */
export type SavedTest = {
  id: string;
  name: string;
  agentId: string;
  skillName: string;
  requestJson: string;
  createdAt: number;
};

/** Workspace row — mirrors Rust WorkspaceRow in a2a/types.rs */
export type WorkspaceRow = {
  id: string;
  name: string;
  createdAt: number;
};
