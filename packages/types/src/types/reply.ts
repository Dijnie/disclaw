/**
 * Reply target for sending messages back to Discord
 * See: docs/disclaw/01-discord-provider.md
 */

export interface ReplyTarget {
  channelId: string;
  messageId?: string;
  threadId?: string;
}
