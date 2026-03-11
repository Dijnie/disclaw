/**
 * discord.js-selfbot-v13 provider implementation
 *
 * Connects via user token (no intents sent — avoids bot detection).
 * API mirrors discord.js but uses `discord.js-selfbot-v13` under the hood.
 *
 * ⚠️ Selfbot usage violates Discord ToS — use at your own risk.
 */

import type { InboundContext, ProviderConfig } from "@disclaw/types";
import type { Provider, MessageHandler } from "./provider-interface.js";
import { isAllowed } from "./allowlist-filter.js";
import {
  splitMessage,
} from "./message-sender.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("discord.js-selfbot-v13");

type SelfbotClient = InstanceType<typeof Client>;

/** Normalize a selfbot message to InboundContext */
function normalizeMessage(message: any): InboundContext {
  return {
    source: "discord",
    method: "selfbot",
    guildId: message.guildId ?? "",
    channelId: message.channelId,
    userId: message.author.id,
    messageId: message.id,
    content: message.content,
    attachments: [...message.attachments.values()].map((att: any) => ({
      id: att.id,
      filename: att.name ?? "unknown",
      url: att.url,
      contentType: att.contentType ?? undefined,
      size: att.size,
    })),
    replyTo: message.reference?.messageId ?? undefined,
    timestamp: message.createdAt,
  };
}

export class SelfbotProvider implements Provider {
  private client: SelfbotClient;
  private handlers: MessageHandler[] = [];
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    // No intents needed — selfbot-v13 handles this internally
    this.client = new Client();
  }

  async connect(): Promise<void> {
    this.client.on("messageCreate", (message: any) => {
      // Ignore own messages (selfbot uses user id, not bot flag)
      if (message.author.id === this.client.user?.id) return;

      // Allowlist filter
      if (
        !isAllowed(this.config, {
          guildId: message.guildId,
          channelId: message.channelId,
          userId: message.author.id,
        })
      ) {
        return;
      }

      const ctx = normalizeMessage(message);
      for (const handler of this.handlers) {
        handler(ctx);
      }
    });

    await this.client.login(this.config.token);
  }

  async disconnect(): Promise<void> {
    await this.client.destroy();
  }

  onMessage(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !("send" in channel)) {
      throw new Error(`Channel ${channelId} not found or not a text channel`);
    }

    const chunks = splitMessage(content);
    for (const chunk of chunks) {
      await channel.send(chunk);
    }
  }

  async replyToMessage(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !("messages" in channel)) {
      throw new Error(`Channel ${channelId} not found or not a text channel`);
    }

    const message = await channel.messages.fetch(messageId);
    const chunks = splitMessage(content);

    // First chunk replies to the original message
    if (chunks[0]) {
      await message.reply(chunks[0]);
    }
    // Remaining chunks sent as follow-up messages
    for (let i = 1; i < chunks.length; i++) {
      await channel.send(chunks[i]!);
    }
  }
}
