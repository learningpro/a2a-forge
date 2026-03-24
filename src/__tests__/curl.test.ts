import { describe, it, expect } from "vitest";
import { generateCurlCommand } from "../lib/curl";

describe("curl", () => {
  describe("generateCurlCommand", () => {
    it("produces a string starting with curl -X POST containing /a2a", () => {
      const result = generateCurlCommand("https://example.com", { test: 1 });

      expect(result).toContain("curl -X POST");
      expect(result).toContain("example.com/a2a");
      expect(result).toContain("Content-Type: application/json");
      expect(result).toContain(JSON.stringify({ test: 1 }));
    });

    it("includes auth header when provided", () => {
      const result = generateCurlCommand(
        "https://example.com",
        { test: 1 },
        "Bearer tok123",
      );

      expect(result).toContain("-H 'Bearer tok123'");
    });

    it("includes extra headers when provided", () => {
      const result = generateCurlCommand(
        "https://example.com",
        { test: 1 },
        undefined,
        { "X-Custom": "val" },
      );

      expect(result).toContain("-H 'X-Custom: val'");
    });

    it("strips trailing slash from agentUrl", () => {
      const result = generateCurlCommand("https://example.com/", { test: 1 });

      expect(result).toContain("example.com/a2a");
      expect(result).not.toContain("example.com//a2a");
    });

    it("handles multiple trailing slashes", () => {
      const result = generateCurlCommand("https://example.com///", { x: 1 });

      expect(result).toContain("example.com/a2a");
    });
  });
});
