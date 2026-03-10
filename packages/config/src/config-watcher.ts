/**
 * File watcher for config hot-reload with 300ms debounce
 * See: docs/disclaw/07-configuration.md § Hot-Reload
 */

import { watch, type FSWatcher } from "node:fs";

import type { DisclawConfig } from "@disclaw/types";
import { loadConfig } from "./config-loader.js";

export type ConfigChangeHandler = (config: DisclawConfig) => void;

export interface ConfigWatcher {
  /** Start watching the config file */
  start(): void;
  /** Stop watching */
  stop(): void;
  /** Register a change handler */
  onChange(handler: ConfigChangeHandler): void;
}

export function createConfigWatcher(configPath: string): ConfigWatcher {
  let watcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const handlers: ConfigChangeHandler[] = [];

  const DEBOUNCE_MS = 300;

  function handleChange() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        const newConfig = loadConfig({ configPath });
        for (const handler of handlers) {
          handler(newConfig);
        }
      } catch (err) {
        console.error("[config-watcher] Failed to reload config:", err);
      }
    }, DEBOUNCE_MS);
  }

  return {
    start() {
      watcher = watch(configPath, handleChange);
    },
    stop() {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    },
    onChange(handler: ConfigChangeHandler) {
      handlers.push(handler);
    },
  };
}
