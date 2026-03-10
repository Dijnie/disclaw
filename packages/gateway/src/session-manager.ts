/**
 * Session state management and persistence
 * See: docs/disclaw/02-gateway.md § Session Manager
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { SessionState, InboundContext } from "@disclaw/types";

export interface SessionManagerOptions {
  /** Path to persist sessions (default: ~/.disclaw/sessions.json) */
  storePath: string;
  /** Session TTL in ms (default: 7 days) */
  ttlMs: number;
  /** Agent ID */
  agentId: string;
}

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private readonly storePath: string;
  private readonly ttlMs: number;
  private readonly agentId: string;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: SessionManagerOptions) {
    this.storePath = options.storePath;
    this.ttlMs = options.ttlMs;
    this.agentId = options.agentId;
  }

  /** Restore sessions from disk */
  restore(): void {
    if (!existsSync(this.storePath)) return;
    try {
      const raw = readFileSync(this.storePath, "utf-8");
      const data = JSON.parse(raw) as SessionState[];
      for (const session of data) {
        // Rehydrate dates
        session.metadata.createdAt = new Date(session.metadata.createdAt);
        session.metadata.lastMessageAt = new Date(session.metadata.lastMessageAt);
        for (const msg of session.conversationHistory) {
          msg.timestamp = new Date(msg.timestamp);
        }
        this.sessions.set(session.sessionKey, session);
      }
    } catch {
      // Corrupted file — start fresh
      this.sessions.clear();
    }
  }

  /** Persist sessions to disk (atomic write) */
  persist(): void {
    mkdirSync(dirname(this.storePath), { recursive: true });
    const data = JSON.stringify([...this.sessions.values()], null, 2);
    const tmpPath = `${this.storePath}.tmp`;
    writeFileSync(tmpPath, data);
    const { renameSync } = require("node:fs") as typeof import("node:fs");
    renameSync(tmpPath, this.storePath);
  }

  /** Get or create a session for the given key */
  getOrCreate(sessionKey: string, inbound: InboundContext): SessionState {
    let session = this.sessions.get(sessionKey);
    if (session) {
      session.metadata.lastMessageAt = new Date();
      return session;
    }

    session = {
      sessionKey,
      agentId: this.agentId,
      conversationHistory: [],
      metadata: {
        createdAt: new Date(),
        lastMessageAt: new Date(),
        guildId: inbound.guildId || undefined,
        channelId: inbound.channelId || undefined,
        userId: inbound.userId || undefined,
      },
      isActive: true,
    };
    this.sessions.set(sessionKey, session);
    return session;
  }

  /** Get an existing session */
  get(sessionKey: string): SessionState | undefined {
    return this.sessions.get(sessionKey);
  }

  /** Remove expired sessions based on TTL */
  cleanup(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions) {
      const age = now - session.metadata.lastMessageAt.getTime();
      if (age > this.ttlMs) {
        this.sessions.delete(key);
      }
    }
  }

  /** Start periodic cleanup (every hour) */
  startCleanup(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /** Stop cleanup timer */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Get total session count */
  get size(): number {
    return this.sessions.size;
  }
}
