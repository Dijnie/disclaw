import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createFileToolHandler } from "../handlers/file.js";
import type { ToolCall } from "@disclaw/types";

function makeToolCall(input: Record<string, unknown>): ToolCall {
  return { toolName: "file", toolCallId: "tc-1", input };
}

describe("createFileToolHandler", () => {
  const workspaceDir = join(tmpdir(), "disclaw-test-file-handler");

  beforeEach(() => {
    mkdirSync(workspaceDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  it("reads an existing file", async () => {
    writeFileSync(join(workspaceDir, "test.txt"), "hello world");
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(makeToolCall({ action: "read", path: "test.txt" }));
    expect(result).toBe("hello world");
  });

  it("returns error for non-existent file", async () => {
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(makeToolCall({ action: "read", path: "missing.txt" }));
    expect(result).toContain("Error");
    expect(result).toContain("not found");
  });

  it("writes a file and creates parent dirs", async () => {
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(
      makeToolCall({ action: "write", path: "sub/dir/file.txt", content: "data" }),
    );
    expect(result).toContain("Wrote");
    expect(result).toContain("4 chars");
  });

  it("lists directory contents", async () => {
    writeFileSync(join(workspaceDir, "a.txt"), "");
    mkdirSync(join(workspaceDir, "subdir"));
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(makeToolCall({ action: "list", path: "." }));
    expect(result).toContain("f a.txt");
    expect(result).toContain("d subdir");
  });

  it("rejects path traversal", async () => {
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(
      makeToolCall({ action: "read", path: "../../etc/passwd" }),
    );
    expect(result).toContain("Error");
    expect(result).toContain("escapes workspace");
  });

  it("returns error for unknown action", async () => {
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(makeToolCall({ action: "delete", path: "test.txt" }));
    expect(result).toContain("Error");
    expect(result).toContain("Unknown action");
  });

  it("requires content for write action", async () => {
    const handler = createFileToolHandler({ workspaceDir });
    const result = await handler(makeToolCall({ action: "write", path: "test.txt" }));
    expect(result).toContain("Error");
    expect(result).toContain("content");
  });
});
