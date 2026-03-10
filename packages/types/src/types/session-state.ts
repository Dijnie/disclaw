/**
 * Gateway-side session persistence type
 * See: docs/disclaw/02-gateway.md
 */

import type { Message } from "./session-context.js";

export interface SessionState {
  sessionKey: string;
  agentId: string;
  conversationHistory: Message[];
  metadata: {
    createdAt: Date;
    lastMessageAt: Date;
    guildId?: string;
    channelId?: string;
    userId?: string;
  };
  isActive: boolean;
}
