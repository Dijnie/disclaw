/**
 * Normalized Discord event from provider → gateway
 * See: docs/disclaw/01-discord-provider.md
 */

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  contentType?: string;
  size: number;
}

export interface InboundContext {
  source: "discord";
  method: "bot" | "selfbot";
  guildId: string;
  channelId: string;
  userId: string;
  messageId: string;
  content: string;
  attachments: Attachment[];
  replyTo?: string;
  timestamp: Date;
}
