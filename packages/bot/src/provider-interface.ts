/**
 * Unified Discord provider interface
 * See: docs/disclaw/01-discord-provider.md
 */

import type { InboundContext } from "@disclaw/types";

export type MessageHandler = (ctx: InboundContext) => void;

export interface Provider {
  /** Connect to Discord */
  connect(): Promise<void>;
  /** Disconnect from Discord */
  disconnect(): Promise<void>;
  /** Register a message handler */
  onMessage(handler: MessageHandler): void;
  /** Send a text message to a channel */
  sendMessage(channelId: string, content: string): Promise<void>;
  /** Reply to a specific message */
  replyToMessage(channelId: string, messageId: string, content: string): Promise<void>;
  /** Send approval request with Approve/Deny buttons, returns true if approved */
  sendApprovalRequest(channelId: string, content: string, userId: string, timeoutMs: number): Promise<boolean>;
}
