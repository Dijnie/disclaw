/**
 * selfbotjs provider placeholder — not implemented
 * See: docs/disclaw/01-discord-provider.md
 */

import type { Provider, MessageHandler } from "./provider-interface.js";

const NOT_IMPLEMENTED = "Selfbot support is planned for a future release";

export class SelfbotProviderStub implements Provider {
  async connect(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async disconnect(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  onMessage(_handler: MessageHandler): void {
    throw new Error(NOT_IMPLEMENTED);
  }

  async sendMessage(_channelId: string, _content: string): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async replyToMessage(
    _channelId: string,
    _messageId: string,
    _content: string,
  ): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
