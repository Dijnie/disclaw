import { describe, it, expect } from "vitest";
import { createGitToolHandler } from "../handlers/git.js";
import type { ToolCall } from "@disclaw/types";

function makeToolCall(command: string, args?: string): ToolCall {
  return { toolName: "git", toolCallId: "tc-1", input: { command, args } };
}

describe("createGitToolHandler", () => {
  const handler = createGitToolHandler({ workspaceDir: process.cwd() });

  it("rejects disallowed git commands", async () => {
    const result = await handler(makeToolCall("reset"));
    expect(result).toContain("Error");
    expect(result).toContain("not allowed");
    expect(result).toContain("status");
  });

  it("rejects checkout command", async () => {
    const result = await handler(makeToolCall("checkout"));
    expect(result).toContain("not allowed");
  });

  it("executes allowed git status", async () => {
    const result = await handler(makeToolCall("status"));
    // Should succeed in a git repo (our cwd is one)
    expect(result).not.toContain("Error: Git command");
  });

  it("executes git log with args", async () => {
    const result = await handler(makeToolCall("log", "--oneline -3"));
    expect(result).not.toContain("Error: Git command");
  });
});
