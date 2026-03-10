/**
 * Outbound message construction and sending
 * See: docs/disclaw/01-discord-provider.md
 *
 * Handles: text (2000 char split), embeds, thread replies, reactions
 */

import type { Client, TextChannel, EmbedBuilder } from "discord.js";

const DISCORD_MAX_LENGTH = 2000;

/** Split a message into 2000-char chunks */
export function splitMessage(content: string): string[] {
  if (content.length <= DISCORD_MAX_LENGTH) return [content];

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= DISCORD_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }
    // Try to split at newline near limit
    let splitAt = remaining.lastIndexOf("\n", DISCORD_MAX_LENGTH);
    if (splitAt === -1 || splitAt < DISCORD_MAX_LENGTH / 2) {
      // Fallback: split at space
      splitAt = remaining.lastIndexOf(" ", DISCORD_MAX_LENGTH);
    }
    if (splitAt === -1) {
      // Hard split
      splitAt = DISCORD_MAX_LENGTH;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

/** Send a text message to a channel, splitting if needed */
export async function sendTextMessage(
  client: Client,
  channelId: string,
  content: string,
): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !("send" in channel)) {
    throw new Error(`Channel ${channelId} not found or not a text channel`);
  }

  const textChannel = channel as TextChannel;
  const chunks = splitMessage(content);

  for (const chunk of chunks) {
    await textChannel.send(chunk);
  }
}

/** Reply to a specific message */
export async function replyToMessage(
  client: Client,
  channelId: string,
  messageId: string,
  content: string,
): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !("messages" in channel)) {
    throw new Error(`Channel ${channelId} not found or not a text channel`);
  }

  const textChannel = channel as TextChannel;
  const message = await textChannel.messages.fetch(messageId);
  const chunks = splitMessage(content);

  // First chunk replies to the original message
  if (chunks[0]) {
    await message.reply(chunks[0]);
  }
  // Remaining chunks sent as follow-up messages
  for (let i = 1; i < chunks.length; i++) {
    await textChannel.send(chunks[i]!);
  }
}
