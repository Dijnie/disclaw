/**
 * Component wiring and startup orchestration
 * See: docs/disclaw/02-gateway.md § Startup Sequence
 *
 * Order: config → memory → skills → tools → agent → sandbox → provider → gateway
 */

import { homedir } from "node:os";
import { join } from "node:path";

import { loadConfig, resolveConfigPath } from "@disclaw/config";
import { MemorySystem } from "@disclaw/memory";
import { loadSkills } from "@disclaw/skills";
import { ToolRegistry, builtInTools } from "@disclaw/tools";
import { SandboxManager } from "@disclaw/sandbox";
import { Gateway } from "@disclaw/gateway";
import { runAgentLoop } from "@disclaw/agent";

import { registerShutdown } from "./shutdown-handler.js";

export interface BootstrapOptions {
  configPath?: string;
  agentId?: string;
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<void> {
  const agentId = options.agentId ?? "default";
  const home = homedir();

  console.log("[disclaw] Starting DisClaw...");

  // 1. Load config
  const configPath = resolveConfigPath(options.configPath);
  const config = loadConfig({ configPath });
  console.log("[disclaw] Config loaded");

  // 2. Initialize memory system
  const memory = new MemorySystem({
    agentId,
    agentsBaseDir: join(home, ".disclaw", "agents"),
    dbPath: join(home, ".disclaw", "memory", `${agentId}.sqlite`),
  });
  memory.syncIndex();
  console.log("[disclaw] Memory system initialized");

  // 3. Load skills
  const skills = loadSkills({
    workspace: join(home, ".disclaw", "agents", agentId, "skills"),
    user: join(home, ".disclaw", "skills"),
  });
  console.log(`[disclaw] Loaded ${skills.length} skills`);

  // 4. Create tool registry
  const toolRegistry = new ToolRegistry();
  for (const tool of builtInTools) {
    toolRegistry.registerTool(tool);
  }
  for (const skill of skills) {
    toolRegistry.registerSkill(skill);
  }
  console.log(`[disclaw] Registered ${builtInTools.length} tools`);

  // 5. Create sandbox
  const sandbox = new SandboxManager(agentId, config.sandbox);

  // 6. Create gateway (includes provider + event routing)
  const gateway = new Gateway({ configPath, agentId });

  // Wire agent runtime to gateway dispatch
  gateway.onDispatch(async (sessionKey, inbound) => {
    const session = gateway.getSessionManager().get(sessionKey);
    if (!session) return;

    const memoryFiles = memory.loadLayers("main");
    const tools = new Map(
      toolRegistry.getAllTools().map((t) => [t.name, t]),
    );

    await runAgentLoop(inbound, {
      config,
      agentId,
      memoryFiles,
      history: session.conversationHistory,
      tools,
      toolHandlers: new Map(), // Tool handlers wired to sandbox in future
      activeSkills: skills.map((s) => s.name),
      onReply: async (content) => {
        console.log(`[agent] Reply (${content.length} chars): ${content.length > 200 ? content.slice(0, 200) + "..." : content}`);
        const provider = gateway.getProvider();
        if (!provider) {
          console.warn("[agent] No provider available, cannot send reply");
          return;
        }
        try {
          if (inbound.messageId && inbound.channelId) {
            await provider.replyToMessage(inbound.channelId, inbound.messageId, content);
          } else if (inbound.channelId) {
            await provider.sendMessage(inbound.channelId, content);
          }
        } catch (err) {
          console.error("[agent] Failed to send reply to Discord:", err);
        }
      },
      onApprovalRequired: async () => {
        // Approval workflow (to be wired to Discord reactions)
        return false; // Default deny for safety
      },
      onPersist: async (history) => {
        session.conversationHistory = history;
        memory.appendDaily(`Processed message from ${inbound.userId}`);
      },
    });
  });

  // 7. Start gateway (connects to Discord, starts WS, cron, heartbeat)
  await gateway.start();

  // 8. Register graceful shutdown
  registerShutdown({ gateway, memory });

  console.log("[disclaw] DisClaw is running");
}
