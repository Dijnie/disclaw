/**
 * Main Gateway class — central control plane
 * See: docs/disclaw/02-gateway.md
 *
 * Startup sequence:
 * 1. Load config
 * 2. Initialize Discord provider
 * 3. Create SessionManager
 * 4. Create EventRouter + register event listeners
 * 5. Start WebSocket server
 * 6. Start cron run loop
 * 7. Start heartbeat timer
 */

import type { DisclawConfig } from "@disclaw/types";
import { createProvider, type Provider } from "@disclaw/bot";
import { resolveConfigPath } from "@disclaw/config";

import { SessionManager } from "./session-manager.js";
import { EventRouter, type AgentHandler } from "./event-router.js";
import { ConfigManager } from "./config-manager.js";
import { HeartbeatTimer, parseDuration } from "./heartbeat-timer.js";
import { CronScheduler } from "./cron-scheduler.js";
import { WsServer } from "./ws-server.js";

export interface GatewayOptions {
  configPath?: string;
  agentId?: string;
}

/** Parse TTL string to ms (e.g., "7d" → 604800000) */
function parseTtl(ttl: string): number {
  return parseDuration(ttl);
}

export class Gateway {
  private configManager: ConfigManager;
  private provider: Provider | null = null;
  private sessionManager: SessionManager;
  private eventRouter: EventRouter;
  private heartbeat: HeartbeatTimer;
  private cron: CronScheduler;
  private wsServer: WsServer | null = null;
  private agentId: string;

  constructor(options: GatewayOptions = {}) {
    this.agentId = options.agentId ?? "default";

    // 1. Load config
    this.configManager = new ConfigManager(options.configPath);
    const config = this.configManager.getConfig();

    // 3. Session manager
    const sessionStore =
      config.gateway?.sessions?.store ?? "~/.disclaw/sessions.json";
    const sessionTtl = config.gateway?.sessions?.ttl ?? "7d";

    this.sessionManager = new SessionManager({
      storePath: sessionStore.replace("~", process.env["HOME"] ?? ""),
      ttlMs: parseTtl(sessionTtl),
      agentId: this.agentId,
    });

    // 4. Event router
    this.eventRouter = new EventRouter(this.sessionManager, this.agentId);

    // 6. Cron scheduler
    const cronPath = `${process.env["HOME"] ?? ""}/.disclaw/cron/jobs.json`;
    this.cron = new CronScheduler(cronPath);

    // 7. Heartbeat timer
    const heartbeatInterval = config.gateway?.heartbeat?.interval ?? "30m";
    this.heartbeat = new HeartbeatTimer(parseDuration(heartbeatInterval));

    // Hot-reload: update heartbeat interval on config change
    this.configManager.onChange((newConfig) => {
      const newInterval = newConfig.gateway?.heartbeat?.interval ?? "30m";
      this.heartbeat.updateInterval(parseDuration(newInterval));
    });
  }

  /** Register the agent runtime handler for dispatched events */
  onDispatch(handler: AgentHandler): void {
    this.eventRouter.onDispatch(handler);
  }

  /** Start the gateway */
  async start(): Promise<void> {
    const config = this.configManager.getConfig();

    // Restore persisted state
    this.sessionManager.restore();
    this.cron.restore();

    // 2. Initialize Discord provider
    this.provider = createProvider(config.provider);
    this.provider.onMessage((ctx) => {
      this.eventRouter.route(ctx).catch((err) => {
        console.error("[gateway] Event routing error:", err);
      });
    });
    await this.provider.connect();

    // 5. Start WebSocket server (optional)
    const port = config.gateway?.port ?? 18789;
    const host = config.gateway?.host ?? "127.0.0.1";
    this.wsServer = new WsServer({ port, host });
    this.wsServer.start();

    // 6. Start cron
    this.cron.start();

    // 7. Start heartbeat
    if (config.gateway?.heartbeat?.enabled !== false) {
      this.heartbeat.start();
    }

    // Session cleanup
    this.sessionManager.startCleanup();

    // Watch config for hot-reload
    const configPath = resolveConfigPath(undefined);
    this.configManager.startWatching(configPath);

    console.log(`[gateway] Started on ${host}:${port}`);
  }

  /** Graceful shutdown */
  async shutdown(): Promise<void> {
    console.log("[gateway] Shutting down...");

    // Stop receiving events
    await this.provider?.disconnect();

    // Flush sessions
    this.sessionManager.persist();
    this.sessionManager.stopCleanup();

    // Stop scheduled tasks
    this.cron.stop();
    this.cron.persist();
    this.heartbeat.stop();

    // Close WebSocket server
    this.wsServer?.stop();

    // Stop config watcher
    this.configManager.stop();

    console.log("[gateway] Shutdown complete");
  }

  /** Get the config manager */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /** Get the session manager */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /** Get the cron scheduler */
  getCronScheduler(): CronScheduler {
    return this.cron;
  }

  /** Get the Discord provider for sending messages */
  getProvider(): Provider | null {
    return this.provider;
  }
}
