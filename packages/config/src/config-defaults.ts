/**
 * Default configuration values matching docs/disclaw/07-configuration.md
 */

import type { DisclawConfig } from "@disclaw/types";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const DEFAULT_CONFIG: DeepPartial<DisclawConfig> = {
  gateway: {
    port: 18789,
    host: "127.0.0.1",
    heartbeat: { enabled: true, interval: "30m" },
    sessions: { store: "~/.disclaw/sessions.json", ttl: "7d" },
    maxMessageSize: 2000,
  },
  agent: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    contextWindow: 200000,
    temperature: 0.7,
    maxTokens: 4096,
  },
  sandbox: {
    enabled: true,
    runtime: "docker" as const,
    docker: {
      image: "node:18-alpine",
      networkMode: "none",
      memoryLimit: "512m",
      cpuLimit: 0.5,
      timeout: 30000,
    },
  },
  skills: { enabled: true, autoReload: true },
  logging: { level: "info", format: "json", output: "stdout", retention: "7d" },
};
