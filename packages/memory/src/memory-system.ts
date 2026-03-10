/**
 * Main MemorySystem orchestrator
 * See: docs/disclaw/04-memory-system.md
 *
 * Composes: memory-loader, memory-writer, vector-indexer, file-watcher
 * Initializes workspace and provides unified memory API
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type {
  MemoryFile,
  MemorySearchRequest,
  MemorySearchResult,
  MemoryGetRequest,
  MemoryGetResult,
} from "@disclaw/types";
import { loadMemoryLayers, type SessionType } from "./memory-loader.js";
import { appendToDaily, updateMemorySection, writeMemoryFile } from "./memory-writer.js";
import { VectorIndexer } from "./vector-indexer.js";
import { createMemoryFileWatcher, type MemoryFileWatcher } from "./memory-file-watcher.js";
import { memorySearch } from "./memory-search-tool.js";
import { memoryGet } from "./memory-get-tool.js";

export interface MemorySystemOptions {
  agentId: string;
  /** Base directory for agent data (default: ~/.disclaw/agents) */
  agentsBaseDir: string;
  /** Path to SQLite database for vector index */
  dbPath: string;
  /** Enable file watcher for auto-indexing */
  enableWatcher?: boolean;
}

const DEFAULT_SOUL = `# Soul

You are a DisClaw AI agent for Discord.

## Core Values
- Be helpful and respectful
- Protect user privacy
- Follow Discord community guidelines
`;

const DEFAULT_AGENTS = `# Agent Config

## Identity
- Type: autonomous
`;

const DEFAULT_MEMORY = `# Long-term Memory
`;

const DEFAULT_HEARTBEAT = `# Heartbeat Checklist
`;

export class MemorySystem {
  private readonly agentDir: string;
  private readonly indexer: VectorIndexer;
  private readonly watcher: MemoryFileWatcher | null;
  private readonly agentId: string;

  constructor(options: MemorySystemOptions) {
    this.agentId = options.agentId;
    this.agentDir = join(options.agentsBaseDir, options.agentId);
    this.indexer = new VectorIndexer(options.dbPath);

    this.initWorkspace();

    if (options.enableWatcher !== false) {
      this.watcher = createMemoryFileWatcher(this.agentDir);
      this.watcher.onDirty((files) => this.indexer.markDirty(files));
      this.watcher.start();
    } else {
      this.watcher = null;
    }
  }

  /** Create workspace directory structure with default files */
  private initWorkspace(): void {
    mkdirSync(join(this.agentDir, "memory"), { recursive: true });

    const defaults: Record<string, string> = {
      "SOUL.md": DEFAULT_SOUL,
      "AGENTS.md": DEFAULT_AGENTS,
      "MEMORY.md": DEFAULT_MEMORY,
      "HEARTBEAT.md": DEFAULT_HEARTBEAT,
    };

    for (const [filename, content] of Object.entries(defaults)) {
      const fullPath = join(this.agentDir, filename);
      if (!existsSync(fullPath)) {
        writeFileSync(fullPath, content);
      }
    }
  }

  /** Load memory layers for the given session type */
  loadLayers(sessionType: SessionType): MemoryFile[] {
    return loadMemoryLayers(this.agentDir, sessionType);
  }

  /** Append to today's daily log */
  appendDaily(content: string, date = new Date()): void {
    appendToDaily(this.agentDir, date, content);
  }

  /** Update a section in MEMORY.md */
  updateMemory(section: string, content: string): void {
    updateMemorySection(this.agentDir, section, content);
  }

  /** Write full content to a memory file */
  writeFile(filename: string, content: string): void {
    writeMemoryFile(this.agentDir, filename, content);
  }

  /** Semantic search over indexed memory */
  search(request: MemorySearchRequest): MemorySearchResult[] {
    // Sync dirty files before searching
    if (this.indexer.hasDirtyFiles()) {
      for (const file of this.indexer.getDirtyFiles()) {
        this.indexer.indexFile(this.agentId, this.agentDir, file);
      }
    }
    return memorySearch(this.indexer, this.agentId, request);
  }

  /** Read a specific memory file or line range */
  get(request: MemoryGetRequest): MemoryGetResult {
    return memoryGet(this.agentDir, request);
  }

  /** Index all memory files (call on session start) */
  syncIndex(): void {
    const filesToIndex = ["SOUL.md", "AGENTS.md", "MEMORY.md", "HEARTBEAT.md"];
    for (const filename of filesToIndex) {
      this.indexer.indexFile(this.agentId, this.agentDir, filename);
    }
  }

  /** Shut down the memory system */
  close(): void {
    this.watcher?.stop();
    this.indexer.close();
  }
}
