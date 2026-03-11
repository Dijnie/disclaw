import { describe, it, expect, vi } from "vitest";
import { executeTool, type ToolHandler } from "../tool-executor.js";
import type { ToolCall, ToolDefinition } from "@disclaw/types";

function makeTool(name: string, requiresApproval = false): ToolDefinition {
  return { name, description: "", inputSchema: {}, requiresApproval };
}

function makeToolCall(toolName: string): ToolCall {
  return { toolName, toolCallId: "tc-1", input: {} };
}

describe("executeTool", () => {
  it("returns error for unknown tool", async () => {
    const result = await executeTool(makeToolCall("unknown"), {
      tools: new Map(),
      handlers: new Map(),
      onApprovalRequired: async () => false,
    });
    expect(result.isError).toBe(true);
    expect(result.output).toContain("Unknown tool");
  });

  it("returns error when no handler registered", async () => {
    const tools = new Map([["bash", makeTool("bash")]]);
    const result = await executeTool(makeToolCall("bash"), {
      tools,
      handlers: new Map(),
      onApprovalRequired: async () => false,
    });
    expect(result.isError).toBe(true);
    expect(result.output).toContain("No handler registered");
  });

  it("executes handler when no approval needed", async () => {
    const tools = new Map([["file", makeTool("file", false)]]);
    const handler: ToolHandler = async () => "file content";
    const handlers = new Map([["file", handler]]);

    const result = await executeTool(makeToolCall("file"), {
      tools,
      handlers,
      onApprovalRequired: async () => false,
    });
    expect(result.isError).toBe(false);
    expect(result.output).toBe("file content");
  });

  it("blocks execution when approval denied", async () => {
    const tools = new Map([["bash", makeTool("bash", true)]]);
    const handler: ToolHandler = async () => "executed";
    const handlers = new Map([["bash", handler]]);

    const result = await executeTool(makeToolCall("bash"), {
      tools,
      handlers,
      onApprovalRequired: async () => false,
    });
    expect(result.isError).toBe(true);
    expect(result.output).toContain("denied");
  });

  it("allows execution when approval granted", async () => {
    const tools = new Map([["bash", makeTool("bash", true)]]);
    const handler: ToolHandler = async () => "executed";
    const handlers = new Map([["bash", handler]]);

    const result = await executeTool(makeToolCall("bash"), {
      tools,
      handlers,
      onApprovalRequired: async () => true,
    });
    expect(result.isError).toBe(false);
    expect(result.output).toBe("executed");
  });

  it("handles handler timeout", async () => {
    const tools = new Map([["slow", makeTool("slow")]]);
    const handler: ToolHandler = async () =>
      new Promise((resolve) => setTimeout(() => resolve("done"), 5000));
    const handlers = new Map([["slow", handler]]);

    const result = await executeTool(makeToolCall("slow"), {
      tools,
      handlers,
      onApprovalRequired: async () => true,
      timeoutMs: 50,
    });
    expect(result.isError).toBe(true);
    expect(result.output).toContain("timeout");
  });

  it("catches handler errors gracefully", async () => {
    const tools = new Map([["broken", makeTool("broken")]]);
    const handler: ToolHandler = async () => {
      throw new Error("handler crashed");
    };
    const handlers = new Map([["broken", handler]]);

    const result = await executeTool(makeToolCall("broken"), {
      tools,
      handlers,
      onApprovalRequired: async () => true,
    });
    expect(result.isError).toBe(true);
    expect(result.output).toContain("handler crashed");
  });

  it("respects role-based permission denial", async () => {
    const tools = new Map([["bash", makeTool("bash")]]);
    const handler: ToolHandler = async () => "executed";
    const handlers = new Map([["bash", handler]]);

    const result = await executeTool(makeToolCall("bash"), {
      tools,
      handlers,
      onApprovalRequired: async () => true,
      permissions: {
        role: "viewer",
        allowedTools: new Set(["file"]),
        skipApproval: false,
      },
    });
    expect(result.isError).toBe(true);
    expect(result.output).toContain("Permission denied");
  });

  it("allows wildcard permissions", async () => {
    const tools = new Map([["bash", makeTool("bash")]]);
    const handler: ToolHandler = async () => "executed";
    const handlers = new Map([["bash", handler]]);

    const result = await executeTool(makeToolCall("bash"), {
      tools,
      handlers,
      onApprovalRequired: async () => true,
      permissions: {
        role: "admin",
        allowedTools: "*",
        skipApproval: true,
      },
    });
    expect(result.isError).toBe(false);
    expect(result.output).toBe("executed");
  });
});
