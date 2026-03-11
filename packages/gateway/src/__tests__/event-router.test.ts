import { describe, it, expect, vi } from "vitest";
import { EventRouter } from "../event-router.js";
import type { InboundContext } from "@disclaw/types";

function makeInbound(overrides: Partial<InboundContext> = {}): InboundContext {
  return {
    source: "discord",
    method: "bot",
    guildId: "g1",
    channelId: "c1",
    userId: "u1",
    messageId: "m1",
    content: "hello",
    attachments: [],
    timestamp: new Date(),
    ...overrides,
  };
}

function makeSessionManager() {
  return {
    getOrCreate: vi.fn().mockReturnValue({
      sessionKey: "test-key",
      conversationHistory: [],
    }),
  } as any;
}

describe("EventRouter", () => {
  it("routes inbound to registered handler", async () => {
    const sm = makeSessionManager();
    const router = new EventRouter(sm, "agent1");
    const handler = vi.fn();
    router.onDispatch(handler);

    await router.route(makeInbound());
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ userId: "u1" }));
  });

  it("creates session via session manager", async () => {
    const sm = makeSessionManager();
    const router = new EventRouter(sm, "agent1");
    router.onDispatch(vi.fn());

    await router.route(makeInbound());
    expect(sm.getOrCreate).toHaveBeenCalledOnce();
  });

  it("does nothing without a registered handler", async () => {
    const sm = makeSessionManager();
    const router = new EventRouter(sm, "agent1");
    // No handler registered — should not throw
    await router.route(makeInbound());
    expect(sm.getOrCreate).toHaveBeenCalled();
  });
});
