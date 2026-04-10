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
      expect(result.params.skill_id).toBe("skill-1");
      expect(result.params.input).toEqual({ prompt: "hello" });
      expect(result.id).toBe(1);
    });

    it("includes context data when provided as valid JSON", () => {
      const result = buildTaskSendPayload("skill-1", "hello", "task-1", '{"key": "val"}');
      expect(result.params.input).toEqual({ prompt: "hello", context: { key: "val" } });
    });

    it("ignores invalid context JSON", () => {
      const result = buildTaskSendPayload("skill-1", "hello", "task-1", "not json");
      expect(result.params.input).toEqual({ prompt: "hello" });
    });

    it("includes file data when provided", () => {
      const file = { name: "test.png", data: "base64data" };
      const result = buildTaskSendPayload("skill-1", "hello", "task-1", undefined, file);
      expect(result.params.input).toEqual({ prompt: "hello", file: { name: "test.png", data: "base64data" } });
    });

    it("includes both context and file when provided", () => {
      const file = { name: "img.jpg", data: "abc123" };
      const result = buildTaskSendPayload("skill-1", "hello", "task-1", '{"mode": "fast"}', file);
      expect(result.params.input).toEqual({
        prompt: "hello",
        context: { mode: "fast" },
        file: { name: "img.jpg", data: "abc123" },
      });
    });
  });

  describe("buildTaskSubscribePayload", () => {
    it("uses tasks/sendSubscribe method", () => {
      const result = buildTaskSubscribePayload("skill-2", "world", "task-456");

      expect(result.method).toBe("tasks/sendSubscribe");
      expect(result.params.id).toBe("task-456");
      expect(result.params.message.parts[0].text).toBe("world");
      expect(result.params.skill_id).toBe("skill-2");
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
