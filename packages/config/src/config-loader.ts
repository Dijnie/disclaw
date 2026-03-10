/**
 * YAML config loader with env var interpolation and validation
 * See: docs/disclaw/07-configuration.md
 *
 * Loading order: hardcoded defaults → YAML file → env var overlay → validate
 * File resolution: --config flag → DISCLAW_CONFIG env → ~/.disclaw/disclaw.config.yaml
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import yaml from "js-yaml";

import type { DisclawConfig } from "@disclaw/types";
import { disclawConfigSchema } from "./config-schema.js";
import { DEFAULT_CONFIG } from "./config-defaults.js";

/** Replace ${ENV_VAR} patterns with process.env values */
function interpolateEnvVars(content: string): string {
  return content.replace(/\$\{(\w+)\}/g, (_match, varName: string) => {
    const value = process.env[varName];
    if (value === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return value;
  });
}

/** Resolve config file path: --config flag → DISCLAW_CONFIG env → default */
export function resolveConfigPath(configFlag?: string): string {
  if (configFlag) return resolve(configFlag);
  if (process.env["DISCLAW_CONFIG"]) return resolve(process.env["DISCLAW_CONFIG"]);
  return resolve(homedir(), ".disclaw", "disclaw.config.yaml");
}

/** Deep merge source into target (source wins) */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = result[key];
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

/** Apply DISCLAW_* env var overlays */
function applyEnvOverlays(config: Record<string, unknown>): void {
  const overlays: Record<string, (val: string) => void> = {
    DISCLAW_GATEWAY_PORT: (val) => {
      const gw = (config["gateway"] ?? {}) as Record<string, unknown>;
      gw["port"] = parseInt(val, 10);
      config["gateway"] = gw;
    },
    DISCLAW_GATEWAY_HOST: (val) => {
      const gw = (config["gateway"] ?? {}) as Record<string, unknown>;
      gw["host"] = val;
      config["gateway"] = gw;
    },
  };

  for (const [envVar, applier] of Object.entries(overlays)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      applier(value);
    }
  }
}

export interface LoadConfigOptions {
  configPath?: string;
}

/** Load and validate config from YAML file */
export function loadConfig(options?: LoadConfigOptions): DisclawConfig {
  const configPath = resolveConfigPath(options?.configPath);

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}\n` +
        `Create one at ~/.disclaw/disclaw.config.yaml or set DISCLAW_CONFIG env var`,
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const interpolated = interpolateEnvVars(raw);
  const parsed = yaml.load(interpolated) as Record<string, unknown>;
  const merged = deepMerge(DEFAULT_CONFIG as Record<string, unknown>, parsed);

  applyEnvOverlays(merged);

  const result = disclawConfigSchema.safeParse(merged);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid configuration:\n${errors}`);
  }

  return result.data as DisclawConfig;
}
