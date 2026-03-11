/**
 * Zod validation schema for disclaw.config.yaml
 * See: docs/disclaw/07-configuration.md
 */

import { z } from "zod";

const roleConfigSchema = z.object({
  users: z.array(z.string()).optional(),
  tools: z.union([z.literal("*"), z.array(z.string())]),
  skipApproval: z.boolean().optional(),
});

const providerSchema = z.object({
  method: z.enum(["bot", "selfbot"]),
  token: z.string().min(1, "Discord token is required"),
  intents: z.array(z.string()).min(1, "At least one intent is required"),
  allowlist: z
    .object({
      guilds: z.array(z.string()).optional(),
      channels: z.array(z.string()).optional(),
      users: z.array(z.string()).optional(),
    })
    .optional(),
  roles: z.record(z.string(), roleConfigSchema).optional(),
});

const agentSchema = z.object({
  provider: z.string().default("anthropic"),
  model: z.string().default("claude-sonnet-4-20250514"),
  contextWindow: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  memorySearch: z
    .object({
      embedder: z.string(),
      store: z.object({
        type: z.string(),
        path: z.string(),
      }),
      similarityThreshold: z.number().min(0).max(1).optional(),
      limit: z.number().positive().optional(),
    })
    .optional(),
});

const gatewaySchema = z
  .object({
    port: z.number().int().positive().optional(),
    host: z.string().optional(),
    heartbeat: z
      .object({
        enabled: z.boolean().optional(),
        interval: z.string(),
      })
      .optional(),
    sessions: z
      .object({
        store: z.string().optional(),
        ttl: z.string().optional(),
      })
      .optional(),
    maxMessageSize: z.number().positive().optional(),
  })
  .optional();

const sandboxDockerSchema = z.object({
  image: z.string().optional(),
  networkMode: z.string().optional(),
  memoryLimit: z.string().optional(),
  cpuLimit: z.number().positive().optional(),
  timeout: z.number().positive().optional(),
});

const sandboxSchema = z
  .object({
    enabled: z.boolean(),
    runtime: z.literal("docker"),
    docker: sandboxDockerSchema.optional(),
    workspace: z.string().optional(),
    denyPaths: z.array(z.string()).optional(),
  })
  .optional();

const llmProviderSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

const toolConfigSchema = z
  .object({
    enabled: z.boolean(),
    requiresApproval: z.boolean().optional(),
    timeout: z.number().positive().optional(),
  })
  .passthrough();

const skillsSchema = z
  .object({
    enabled: z.boolean(),
    paths: z.array(z.string()).optional(),
    autoReload: z.boolean().optional(),
  })
  .optional();

const loggingSchema = z
  .object({
    level: z.enum(["debug", "info", "warn", "error"]).optional(),
    format: z.enum(["json", "text"]).optional(),
    output: z.string().optional(),
    retention: z.string().optional(),
  })
  .optional();

export const disclawConfigSchema = z.object({
  provider: providerSchema,
  agent: agentSchema,
  gateway: gatewaySchema,
  sandbox: sandboxSchema,
  providers: z.record(z.string(), llmProviderSchema).optional(),
  tools: z.record(z.string(), toolConfigSchema).optional(),
  skills: skillsSchema,
  logging: loggingSchema,
});
