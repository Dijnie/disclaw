/**
 * Graceful shutdown handler — SIGINT/SIGTERM
 * See: docs/disclaw/02-gateway.md § Graceful Shutdown
 */

import type { Gateway } from "@disclaw/gateway";
import type { MemorySystem } from "@disclaw/memory";
import type { SandboxManager } from "@disclaw/sandbox";

export interface ShutdownContext {
  gateway: Gateway;
  memory: MemorySystem;
  sandbox?: SandboxManager;
}

/** Register shutdown handlers for graceful cleanup */
export function registerShutdown(context: ShutdownContext): void {
  let shutdownInProgress = false;

  const handleShutdown = async (signal: string): Promise<void> => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;

    console.log(`\n[disclaw] Received ${signal}, shutting down...`);

    try {
      await context.gateway.shutdown();
      context.memory.close();
      console.log("[disclaw] Shutdown complete");
      process.exit(0);
    } catch (err) {
      console.error("[disclaw] Shutdown error:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}
