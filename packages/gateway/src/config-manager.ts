/**
 * Config manager — load, watch, broadcast changes
 * See: docs/disclaw/02-gateway.md
 */

import type { DisclawConfig } from "@disclaw/types";
import {
  loadConfig,
  createConfigWatcher,
  type ConfigWatcher,
  type ConfigChangeHandler,
} from "@disclaw/config";

export class ConfigManager {
  private config: DisclawConfig;
  private watcher: ConfigWatcher | null = null;
  private handlers: ConfigChangeHandler[] = [];

  constructor(configPath?: string) {
    this.config = loadConfig({ configPath });
  }

  /** Get current config */
  getConfig(): DisclawConfig {
    return this.config;
  }

  /** Start watching for config file changes */
  startWatching(configPath: string): void {
    this.watcher = createConfigWatcher(configPath);
    this.watcher.onChange((newConfig) => {
      this.config = newConfig;
      for (const handler of this.handlers) {
        handler(newConfig);
      }
    });
    this.watcher.start();
  }

  /** Register a config change handler */
  onChange(handler: ConfigChangeHandler): void {
    this.handlers.push(handler);
  }

  /** Stop watching */
  stop(): void {
    this.watcher?.stop();
  }
}
