import { describe, it, expect, vi } from "vitest";
import { createBashToolHandler } from "../handlers/bash.js";
import type { ToolCall } from "@disclaw/types";

function makeToolCall(command: string): ToolCall {
  return { toolName: "bash", toolCallId: "tc-1", input: { command } };
}

describe("createBashToolHandler", () => {
  it("returns formatted output from sandbox execution", async () => {
    const sandbox = {
      execute: vi.fn().mockResolvedValue({ stdout: "hello", stderr: "", exitCode: 0 }),
    } as any;

    const handler = createBashToolHandler({ sandbox });
    const result = await handler(makeToolCall("echo hello"));

    expect(sandbox.execute).toHaveBeenCalledWith("echo hello");
    expect(result).toContain("hello");
    expect(result).toContain("[exit code: 0]");
  });

  it("includes stderr in output when present", async () => {
    const sandbox = {
      execute: vi.fn().mockResolvedValue({ stdout: "", stderr: "warning", exitCode: 1 }),
    } as any;

    const handler = createBashToolHandler({ sandbox });
    const result = await handler(makeToolCall("bad-cmd"));

    expect(result).toContain("[stderr] warning");
    expect(result).toContain("[exit code: 1]");
  });

  it("returns error string when command is empty", async () => {
    const sandbox = { execute: vi.fn() } as any;

    const handler = createBashToolHandler({ sandbox });
    const result = await handler(makeToolCall(""));

    expect(result).toContain("Error");
    expect(sandbox.execute).not.toHaveBeenCalled();
  });

  it("catches sandbox errors gracefully", async () => {
    const sandbox = {
      execute: vi.fn().mockRejectedValue(new Error("Docker not running")),
    } as any;

    const handler = createBashToolHandler({ sandbox });
    const result = await handler(makeToolCall("ls"));

    expect(result).toContain("Error");
    expect(result).toContain("Docker not running");
  });
});
