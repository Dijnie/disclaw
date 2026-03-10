/**
 * @disclaw/memory - Markdown-based memory system with SQLite indexing
 */

export { MemorySystem } from "./memory-system.js";
export type { MemorySystemOptions } from "./memory-system.js";
export { loadMemoryLayers, readMemoryFile } from "./memory-loader.js";
export type { SessionType } from "./memory-loader.js";
export { appendToDaily, updateMemorySection, writeMemoryFile } from "./memory-writer.js";
export { VectorIndexer } from "./vector-indexer.js";
export { createMemoryFileWatcher } from "./memory-file-watcher.js";
export type { MemoryFileWatcher, DirtyHandler } from "./memory-file-watcher.js";
export { memorySearch } from "./memory-search-tool.js";
export { memoryGet } from "./memory-get-tool.js";
