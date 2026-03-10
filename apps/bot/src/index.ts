#!/usr/bin/env node
/**
 * @disclaw/bot-app - Main entry point for DisClaw Discord AI agent
 */

import { bootstrap } from "./bootstrap.js";

// Parse CLI args
const args = process.argv.slice(2);
let configPath: string | undefined;
let agentId: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--config" && args[i + 1]) {
    configPath = args[++i];
  } else if (args[i] === "--agent" && args[i + 1]) {
    agentId = args[++i];
  }
}

bootstrap({ configPath, agentId }).catch((err) => {
  console.error("[disclaw] Fatal error:", err);
  process.exit(1);
});
