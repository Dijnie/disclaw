/**
 * discord.js bot provider implementation
 * See: docs/disclaw/01-discord-provider.md
 *
 * Connects via bot token, normalizes Discord messages → InboundContext,
 * filters via allowlist, emits to handlers.
 */

import { Client, GatewayIntentBits, type Message } from "discord.js";

import type { InboundContext, ProviderConfig } from "@disclaw/types";
import type { Provider, MessageHandler } from "./provider-interface.js";
import { isAllowed } from "./allowlist-filter.js";
import {
  sendTextMessage,
  replyToMessage as sendReply,
} from "./message-sender.js";

/** Map intent string names from config to discord.js GatewayIntentBits */
const INTENT_MAP: Record<string, number> = {
  Guilds: GatewayIntentBits.Guilds,
  GuildMessages: GatewayIntentBits.GuildMessages,
  MessageContent: GatewayIntentBits.MessageContent,
  DirectMessages: GatewayIntentBits.DirectMessages,
  GuildMembers: GatewayIntentBits.GuildMembers,
  GuildVoiceStates: GatewayIntentBits.GuildVoiceStates,
  MessageReactions: GatewayIntentBits.GuildMessageReactions,
  GuildPresences: GatewayIntentBits.GuildPresences,
};

/** Resolve intent names to discord.js bit values */
function resolveIntents(intentNames: string[]): number[] {
  return intentNames.map((name) => {
    const bit = INTENT_MAP[name];
    if (bit === undefined) {
      throw new Error(`Unknown Discord intent: ${name}`);
    }
    return bit;
  });
}

/** Normalize a discord.js Message to InboundContext */
function normalizeMessage(message: Message): InboundContext {
  return {
    source: "discord",
    method: "bot",
    guildId: message.guildId ?? "",
    channelId: message.channelId,
    userId: message.author.id,
    messageId: message.id,
    content: message.content,
    attachments: [...message.attachments.values()].map((att) => ({
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

export class DiscordJsProvider implements Provider {
  private client: Client;
  private handlers: MessageHandler[] = [];
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    const intents = resolveIntents(config.intents);
    this.client = new Client({ intents });
  }

  async connect(): Promise<void> {
    this.client.on("messageCreate", (message: Message) => {
      // Ignore bot's own messages
      if (message.author.bot) return;

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
    await sendTextMessage(this.client, channelId, content);
  }

  async replyToMessage(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<void> {
    await sendReply(this.client, channelId, messageId, content);
  }
}
