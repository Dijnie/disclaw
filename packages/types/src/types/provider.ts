/**
 * Discord provider interface contract
 * See: docs/disclaw/01-discord-provider.md
 */

import type { InboundContext } from "./inbound-context.js";

export type ProviderMethod = "bot" | "selfbot";

export interface DiscordProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(handler: (ctx: InboundContext) => void): void;
  sendMessage(channelId: string, content: string): Promise<void>;
}
