/**
 * Session key computation per scope hierarchy
 * See: docs/disclaw/01-discord-provider.md
 *
 * Priority order:
 * 1. guild+channel+user → "{agentId}:guild:{guildId}:channel:{channelId}:user:{userId}"
 * 2. guild+channel       → "{agentId}:guild:{guildId}:channel:{channelId}"
 * 3. guild+user (DM)     → "{agentId}:guild:{guildId}:user:{userId}"
 * 4. guild               → "{agentId}:guild:{guildId}"
 * 5. user (DM no guild)  → "{agentId}:user:{userId}"
 */

export interface SessionKeyContext {
  agentId: string;
  guildId?: string | null;
  channelId?: string | null;
  userId: string;
}

/** Compute session key based on available scope identifiers */
export function buildSessionKey(ctx: SessionKeyContext): string {
  const { agentId, guildId, channelId, userId } = ctx;

  if (guildId && channelId) {
    return `${agentId}:guild:${guildId}:channel:${channelId}:user:${userId}`;
  }
  if (guildId) {
    return `${agentId}:guild:${guildId}:user:${userId}`;
  }
  // DM outside guild
  return `${agentId}:user:${userId}`;
}
