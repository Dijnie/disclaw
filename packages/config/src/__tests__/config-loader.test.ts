import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, resolveConfigPath } from "../config-loader.js";

describe("resolveConfigPath", () => {
  it("uses flag value when provided", () => {
    expect(resolveConfigPath("/custom/path.yaml")).toBe("/custom/path.yaml");
  });

  it("falls back to env var", () => {
    const prev = process.env["DISCLAW_CONFIG"];
    process.env["DISCLAW_CONFIG"] = "/env/config.yaml";
    try {
      expect(resolveConfigPath()).toBe("/env/config.yaml");
    } finally {
      if (prev !== undefined) process.env["DISCLAW_CONFIG"] = prev;
      else delete process.env["DISCLAW_CONFIG"];
    }
  });
});

describe("loadConfig", () => {
  const testDir = join(tmpdir(), "disclaw-test-config");
  const configPath = join(testDir, "config.yaml");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("throws for missing config file", () => {
    expect(() => loadConfig({ configPath: "/nonexistent/config.yaml" })).toThrow(
      "Config file not found",
    );
  });

  it("loads and validates a minimal valid config", () => {
    const prev = process.env["DISCORD_BOT_TOKEN"];
    process.env["DISCORD_BOT_TOKEN"] = "test-token";
    try {
      writeFileSync(
        configPath,
        `
provider:
  method: bot
  token: \${DISCORD_BOT_TOKEN}
  intents:
    - Guilds
    - GuildMessages
    - MessageContent
    - DirectMessages
agent:
  provider: anthropic
  model: claude-sonnet-4-20250514
`,
      );
      const config = loadConfig({ configPath });
      expect(config.provider.token).toBe("test-token");
      expect(config.agent.provider).toBe("anthropic");
    } finally {
      if (prev !== undefined) process.env["DISCORD_BOT_TOKEN"] = prev;
      else delete process.env["DISCORD_BOT_TOKEN"];
    }
  });

  it("throws for missing env var in interpolation", () => {
    writeFileSync(
      configPath,
      `
provider:
  method: bot
  token: \${NONEXISTENT_VAR_12345}
  intents: [Guilds]
`,
    );
    expect(() => loadConfig({ configPath })).toThrow("NONEXISTENT_VAR_12345");
  });
});
