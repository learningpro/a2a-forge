import { describe, it, expect } from "vitest";

/**
 * Tests for the streaming task status resolution logic.
 * The actual hook is tightly coupled to Tauri Channel/commands,
 * so we test the core logic extracted here.
 */

const TERMINAL_STATES = new Set(["completed", "failed", "canceled"]);

function resolveTaskStatus(
  timedOut: boolean,
  finalStatus: string | undefined,
): "completed" | "failed" {
  if (timedOut && !finalStatus) return "failed";
  if (finalStatus === "failed" || finalStatus === "canceled") return "failed";
  return "completed";
}

describe("streaming task status resolution", () => {
  describe("TERMINAL_STATES", () => {
    it("includes completed, failed, canceled", () => {
      expect(TERMINAL_STATES.has("completed")).toBe(true);
      expect(TERMINAL_STATES.has("failed")).toBe(true);
      expect(TERMINAL_STATES.has("canceled")).toBe(true);
    });

    it("does not include non-terminal states", () => {
      expect(TERMINAL_STATES.has("running")).toBe(false);
      expect(TERMINAL_STATES.has("pending")).toBe(false);
      expect(TERMINAL_STATES.has("submitted")).toBe(false);
    });
  });

  describe("resolveTaskStatus", () => {
    it("returns completed when stream finishes with completed status", () => {
      expect(resolveTaskStatus(false, "completed")).toBe("completed");
    });

    it("returns failed when stream finishes with failed status", () => {
      expect(resolveTaskStatus(false, "failed")).toBe("failed");
    });

    it("returns failed when stream finishes with canceled status", () => {
      expect(resolveTaskStatus(false, "canceled")).toBe("failed");
    });

    it("returns failed on timeout with no final status", () => {
      expect(resolveTaskStatus(true, undefined)).toBe("failed");
    });

    it("returns completed on timeout if last chunk had completed status", () => {
      expect(resolveTaskStatus(true, "completed")).toBe("completed");
    });

    it("returns failed on timeout if last chunk had failed status", () => {
      expect(resolveTaskStatus(true, "failed")).toBe("failed");
    });

    it("returns completed when no timeout and undefined status (edge case)", () => {
      expect(resolveTaskStatus(false, undefined)).toBe("completed");
    });
  });
});
