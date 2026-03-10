/**
 * @disclaw/bot - Discord provider (discord.js bot, selfbotjs placeholder)
 */

import type { ProviderConfig } from "@disclaw/types";
import type { Provider } from "./provider-interface.js";
import { DiscordJsProvider } from "./discord-js-provider.js";
import { SelfbotProviderStub } from "./selfbot-provider-stub.js";

/** Factory: create a Discord provider based on config method */
export function createProvider(config: ProviderConfig): Provider {
  switch (config.method) {
    case "bot":
      return new DiscordJsProvider(config);
    case "selfbot":
      return new SelfbotProviderStub();
    default:
      throw new Error(`Unknown provider method: ${config.method}`);
  }
}

export { DiscordJsProvider } from "./discord-js-provider.js";
export { SelfbotProviderStub } from "./selfbot-provider-stub.js";
export type { Provider, MessageHandler } from "./provider-interface.js";
export { isAllowed } from "./allowlist-filter.js";
export { buildSessionKey } from "./session-key-builder.js";
export type { SessionKeyContext } from "./session-key-builder.js";
export { splitMessage } from "./message-sender.js";
