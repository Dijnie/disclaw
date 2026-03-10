/**
 * Route InboundContext events to sessions
 * See: docs/disclaw/02-gateway.md § Event Router
 */

import type { InboundContext } from "@disclaw/types";
import { buildSessionKey } from "@disclaw/bot";
import type { SessionManager } from "./session-manager.js";

export type AgentHandler = (
  sessionKey: string,
  inbound: InboundContext,
) => void | Promise<void>;

export class EventRouter {
  private handler: AgentHandler | null = null;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly agentId: string,
  ) {}

  /** Register the agent runtime handler */
  onDispatch(handler: AgentHandler): void {
    this.handler = handler;
  }

  /** Route an inbound event to the correct session and dispatch */
  async route(inbound: InboundContext): Promise<void> {
    const sessionKey = buildSessionKey({
      agentId: this.agentId,
      guildId: inbound.guildId || null,
      channelId: inbound.channelId || null,
      userId: inbound.userId,
    });

    // Get or create the session
    this.sessionManager.getOrCreate(sessionKey, inbound);

    // Dispatch to agent runtime
    if (this.handler) {
      await this.handler(sessionKey, inbound);
    }
  }
}
