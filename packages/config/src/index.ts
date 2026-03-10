/**
 * @disclaw/config - YAML configuration loader with env var overlay and hot-reload
 */

export { loadConfig, resolveConfigPath } from "./config-loader.js";
export type { LoadConfigOptions } from "./config-loader.js";
export { createConfigWatcher } from "./config-watcher.js";
export type { ConfigWatcher, ConfigChangeHandler } from "./config-watcher.js";
export { DEFAULT_CONFIG } from "./config-defaults.js";
export { disclawConfigSchema } from "./config-schema.js";
