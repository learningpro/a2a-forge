import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

describe("bundle safety", () => {
  it("should not import Monaco Editor in any source file at startup", () => {
    const srcDir = path.resolve(__dirname, "..");
    const sourceFiles = getAllTsFiles(srcDir);
    const monacoImports = sourceFiles.filter((file) => {
      // Skip test files themselves
      if (file.includes("__tests__") || file.includes(".test.")) return false;
      // MonacoWrapper is the designated wrapper — it's the ONLY file allowed to import Monaco directly
      if (file.endsWith("MonacoWrapper.tsx")) return false;
      const content = fs.readFileSync(file, "utf-8");
      return (
        content.includes('from "monaco-editor"') ||
        content.includes('from "@monaco-editor/react"') ||
        content.includes('require("monaco-editor")') ||
        content.includes('require("@monaco-editor/react")')
      );
    });
    expect(monacoImports).toEqual([]);
  });
});

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "__tests__") {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}
