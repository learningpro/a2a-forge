import { describe, it, expect } from "vitest";
import {
  buildTaskSendPayload,
  buildTaskSubscribePayload,
  generateTaskId,
} from "../lib/a2a";

describe("a2a", () => {
  describe("buildTaskSendPayload", () => {
    it("produces correct JSON-RPC format with tasks/send method", () => {
      const result = buildTaskSendPayload("skill-1", "hello", "task-123");

      expect(result.jsonrpc).toBe("2.0");
      expect(result.method).toBe("tasks/send");
      expect(result.params.id).toBe("task-123");
      expect(result.params.message.role).toBe("user");
      expect(result.params.message.parts).toHaveLength(1);
      expect(result.params.message.parts[0].type).toBe("text");
      expect(result.params.message.parts[0].text).toBe("hello");
      expect(result.params.metadata.skill_id).toBe("skill-1");
      expect(result.id).toBe(1);
    });
  });

  describe("buildTaskSubscribePayload", () => {
    it("uses tasks/sendSubscribe method", () => {
      const result = buildTaskSubscribePayload("skill-2", "world", "task-456");

      expect(result.method).toBe("tasks/sendSubscribe");
      expect(result.params.id).toBe("task-456");
      expect(result.params.message.parts[0].text).toBe("world");
      expect(result.params.metadata.skill_id).toBe("skill-2");
    });
  });

  describe("generateTaskId", () => {
    it("returns a valid UUID string (36 chars, matches pattern)", () => {
      const id = generateTaskId();

      expect(id).toHaveLength(36);
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("returns unique values on each call", () => {
      const id1 = generateTaskId();
      const id2 = generateTaskId();
      expect(id1).not.toBe(id2);
    });
  });
});
