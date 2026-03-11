import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { rmSync } from "node:fs";
import { SessionManager } from "../session-manager.js";
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

describe("SessionManager", () => {
  const storePath = join(tmpdir(), "disclaw-test-sessions", "sessions.json");

  afterEach(() => {
    rmSync(join(tmpdir(), "disclaw-test-sessions"), { recursive: true, force: true });
  });

  it("creates a new session via getOrCreate", () => {
    const sm = new SessionManager({ storePath, ttlMs: 60_000, agentId: "test" });
    const session = sm.getOrCreate("key-1", makeInbound());
    expect(session.sessionKey).toBe("key-1");
    expect(session.conversationHistory).toEqual([]);
    expect(sm.size).toBe(1);
  });

  it("returns existing session on second call", () => {
    const sm = new SessionManager({ storePath, ttlMs: 60_000, agentId: "test" });
    const s1 = sm.getOrCreate("key-1", makeInbound());
    s1.conversationHistory.push({ role: "user", content: "hi", timestamp: new Date() } as any);
    const s2 = sm.getOrCreate("key-1", makeInbound());
    expect(s2.conversationHistory).toHaveLength(1);
  });

  it("get returns undefined for missing session", () => {
    const sm = new SessionManager({ storePath, ttlMs: 60_000, agentId: "test" });
    expect(sm.get("nonexistent")).toBeUndefined();
  });

  it("persists and restores sessions", () => {
    const sm1 = new SessionManager({ storePath, ttlMs: 60_000, agentId: "test" });
    sm1.getOrCreate("key-1", makeInbound());
    sm1.persist();

    const sm2 = new SessionManager({ storePath, ttlMs: 60_000, agentId: "test" });
    sm2.restore();
    expect(sm2.size).toBe(1);
    expect(sm2.get("key-1")).toBeDefined();
  });

  it("cleans up expired sessions", () => {
    const sm = new SessionManager({ storePath, ttlMs: 1, agentId: "test" });
    const session = sm.getOrCreate("key-1", makeInbound());
    // Force the session to be old
    session.metadata.lastMessageAt = new Date(Date.now() - 1000);
    sm.cleanup();
    expect(sm.size).toBe(0);
  });
});
