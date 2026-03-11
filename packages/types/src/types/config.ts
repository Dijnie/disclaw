/**
 * Configuration schema types matching disclaw.config.yaml
 * See: docs/disclaw/07-configuration.md
 */

/** Per-role permission config: which tools are accessible and approval behavior */
export interface RoleConfig {
  /** Discord user IDs assigned to this role */
  users?: string[];
  /** Allowed tool names, or "*" for all tools */
  tools: string[] | "*";
  /** If true, skip approval gates for this role (e.g., owner) */
  skipApproval?: boolean;
}

export interface ProviderConfig {
  method: "bot" | "selfbot";
  token: string;
  intents: string[];
  allowlist?: {
    guilds?: string[];
    channels?: string[];
    users?: string[];
  };
  /** Role-based permissions. Key = role name, "user" is the default fallback role */
  roles?: Record<string, RoleConfig>;
}

export interface AgentConfig {
  provider: string;
  model: string;
  contextWindow?: number;
  temperature?: number;
  maxTokens?: number;
  memorySearch?: {
    embedder: string;
    store: {
      type: string;
      path: string;
    };
    similarityThreshold?: number;
    limit?: number;
  };
}

export interface GatewayConfig {
  port?: number;
  host?: string;
  heartbeat?: {
    enabled?: boolean;
    interval: string;
  };
  sessions?: {
    store?: string;
    ttl?: string;
  };
  maxMessageSize?: number;
}

export interface SandboxDockerConfig {
  image?: string;
  networkMode?: string;
  memoryLimit?: string;
  cpuLimit?: number;
  timeout?: number;
}

export interface SandboxConfig {
  enabled: boolean;
  runtime: "docker";
  docker?: SandboxDockerConfig;
  workspace?: string;
  denyPaths?: string[];
}

export interface LLMProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface ToolConfig {
  enabled: boolean;
  requiresApproval?: boolean;
  timeout?: number;
  [key: string]: unknown;
}

export interface SkillsConfig {
  enabled: boolean;
  paths?: string[];
  autoReload?: boolean;
}

export interface LoggingConfig {
  level?: "debug" | "info" | "warn" | "error";
  format?: "json" | "text";
  output?: string;
  retention?: string;
}

export interface DisclawConfig {
  provider: ProviderConfig;
  agent: AgentConfig;
  gateway?: GatewayConfig;
  sandbox?: SandboxConfig;
  providers?: Record<string, LLMProviderConfig>;
  tools?: Record<string, ToolConfig>;
  skills?: SkillsConfig;
  logging?: LoggingConfig;
}
