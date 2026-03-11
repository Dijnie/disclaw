import { describe, it, expect, vi } from "vitest";
import { requestApproval } from "../approval-gate.js";
import type { ToolCall } from "@disclaw/types";

function makeToolCall(toolName: string, input: Record<string, unknown> = {}): ToolCall {
  return { toolName, toolCallId: "tc-1", input };
}

function makeProvider(approved: boolean) {
  return {
    sendApprovalRequest: vi.fn().mockResolvedValue(approved),
  } as any;
}

describe("requestApproval", () => {
  it("returns true when user approves", async () => {
    const provider = makeProvider(true);
    const result = await requestApproval(makeToolCall("bash", { command: "ls" }), {
      provider,
      channelId: "ch-1",
      userId: "user-1",
    });
    expect(result).toBe(true);
    expect(provider.sendApprovalRequest).toHaveBeenCalledOnce();
  });

  it("returns false when user denies", async () => {
    const provider = makeProvider(false);
    const result = await requestApproval(makeToolCall("git", { command: "push" }), {
      provider,
      channelId: "ch-1",
      userId: "user-1",
    });
    expect(result).toBe(false);
  });

  it("returns false on provider error (fail-closed)", async () => {
    const provider = {
      sendApprovalRequest: vi.fn().mockRejectedValue(new Error("network error")),
    } as any;
    const result = await requestApproval(makeToolCall("bash"), {
      provider,
      channelId: "ch-1",
      userId: "user-1",
    });
    expect(result).toBe(false);
  });

  it("passes timeout to provider", async () => {
    const provider = makeProvider(true);
    await requestApproval(makeToolCall("bash"), {
      provider,
      channelId: "ch-1",
      userId: "user-1",
      timeoutMs: 30_000,
    });
    expect(provider.sendApprovalRequest).toHaveBeenCalledWith(
      "ch-1",
      expect.any(String),
      "user-1",
      30_000,
    );
  });

  it("truncates long input in approval message", async () => {
    const provider = makeProvider(true);
    const longInput = { command: "a".repeat(500) };
    await requestApproval(makeToolCall("bash", longInput), {
      provider,
      channelId: "ch-1",
      userId: "user-1",
    });
    const content = provider.sendApprovalRequest.mock.calls[0]![1] as string;
    expect(content.length).toBeLessThan(600);
  });
});
