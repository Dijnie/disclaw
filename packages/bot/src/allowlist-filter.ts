/**
 * Allowlist filtering for guilds, channels, users
 * See: docs/disclaw/07-configuration.md § provider.allowlist
 *
 * If no allowlist configured → allow all
 * Guilds required if allowlist present; channels/users optional
 */

import type { ProviderConfig } from "@disclaw/types";

export interface AllowlistContext {
  guildId: string | null;
  channelId: string;
  userId: string;
}

/** Check if an event passes the allowlist filter */
export function isAllowed(
  config: ProviderConfig,
  ctx: AllowlistContext,
): boolean {
  const { allowlist } = config;

  // No allowlist → allow everything
  if (!allowlist) return true;

  // Check guild allowlist (required if allowlist exists)
  if (allowlist.guilds && allowlist.guilds.length > 0) {
    if (!ctx.guildId || !allowlist.guilds.includes(ctx.guildId)) {
      return false;
    }
  }

  // Check channel allowlist (optional)
  if (allowlist.channels && allowlist.channels.length > 0) {
    if (!allowlist.channels.includes(ctx.channelId)) {
      return false;
    }
  }

  // Check user allowlist (optional)
  if (allowlist.users && allowlist.users.length > 0) {
    if (!allowlist.users.includes(ctx.userId)) {
      return false;
    }
  }

  return true;
}
