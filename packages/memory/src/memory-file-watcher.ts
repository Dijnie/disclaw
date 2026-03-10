/**
 * Monitor memory directory for file changes, mark vector index dirty
 * See: docs/disclaw/04-memory-system.md § Vector Indexing (1.5s debounce)
 */

import { watch, type FSWatcher } from "node:fs";
import { relative } from "node:path";

export type DirtyHandler = (files: string[]) => void;

export interface MemoryFileWatcher {
  start(): void;
  stop(): void;
  onDirty(handler: DirtyHandler): void;
}

export function createMemoryFileWatcher(agentDir: string): MemoryFileWatcher {
  let watcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingFiles = new Set<string>();
  const handlers: DirtyHandler[] = [];

  const DEBOUNCE_MS = 1500;

  function handleChange(_event: string, filename: string | null): void {
    if (!filename) return;
    // Only track .md files
    if (!filename.endsWith(".md")) return;

    const relPath = relative(agentDir, filename);
    pendingFiles.add(relPath || filename);

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const files = [...pendingFiles];
      pendingFiles.clear();
      for (const handler of handlers) {
        handler(files);
      }
    }, DEBOUNCE_MS);
  }

  return {
    start() {
      watcher = watch(agentDir, { recursive: true }, handleChange);
    },
    stop() {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    },
    onDirty(handler: DirtyHandler) {
      handlers.push(handler);
    },
  };
}
