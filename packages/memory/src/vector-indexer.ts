/**
 * SQLite-based vector indexer for semantic memory search
 * See: docs/disclaw/04-memory-system.md § Vector Indexing
 *
 * NOTE: Embedding computation is stubbed — will be implemented with
 * Anthropic/OpenAI embedder in a later phase. Currently stores text chunks
 * and supports keyword-based fallback search.
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface IndexedChunk {
  filename: string;
  startLine: number;
  endLine: number;
  content: string;
}

export class VectorIndexer {
  private db: Database.Database;
  private dirtyFiles = new Set<string>();

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_agent ON memory_chunks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_filename ON memory_chunks(filename);
    `);
  }

  /** Mark files as needing re-index */
  markDirty(files: string[]): void {
    for (const f of files) {
      this.dirtyFiles.add(f);
    }
  }

  /** Index a file's content into chunks (paragraph-based splitting) */
  indexFile(agentId: string, agentDir: string, filename: string): void {
    const fullPath = join(agentDir, filename);
    if (!existsSync(fullPath)) return;

    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    // Remove existing chunks for this file
    this.db
      .prepare("DELETE FROM memory_chunks WHERE agent_id = ? AND filename = ?")
      .run(agentId, filename);

    // Split into chunks (by paragraph/heading boundaries)
    const insert = this.db.prepare(
      "INSERT INTO memory_chunks (agent_id, filename, start_line, end_line, content) VALUES (?, ?, ?, ?, ?)",
    );

    let chunkStart = 0;
    let chunk: string[] = [];

    const flushChunk = (): void => {
      const text = chunk.join("\n").trim();
      if (text.length > 0) {
        insert.run(agentId, filename, chunkStart + 1, chunkStart + chunk.length, text);
      }
      chunk = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      // Split on headings or double newlines
      if (line.startsWith("## ") && chunk.length > 0) {
        flushChunk();
        chunkStart = i;
      }
      chunk.push(line);
    }
    flushChunk();

    this.dirtyFiles.delete(filename);
  }

  /**
   * Search indexed chunks (keyword-based fallback until embeddings are implemented)
   * Returns matching chunks sorted by relevance
   */
  search(agentId: string, query: string, limit = 5): IndexedChunk[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    // Simple keyword match — will be replaced with vector similarity
    const rows = this.db
      .prepare(
        "SELECT filename, start_line, end_line, content FROM memory_chunks WHERE agent_id = ?",
      )
      .all(agentId) as Array<{
      filename: string;
      start_line: number;
      end_line: number;
      content: string;
    }>;

    const scored = rows
      .map((row) => {
        const lower = row.content.toLowerCase();
        const matchCount = words.filter((w) => lower.includes(w)).length;
        return { ...row, score: matchCount / words.length };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((r) => ({
      filename: r.filename,
      startLine: r.start_line,
      endLine: r.end_line,
      content: r.content,
    }));
  }

  /** Check if any files need re-indexing */
  hasDirtyFiles(): boolean {
    return this.dirtyFiles.size > 0;
  }

  /** Get list of dirty files */
  getDirtyFiles(): string[] {
    return [...this.dirtyFiles];
  }

  /** Close the database */
  close(): void {
    this.db.close();
  }
}
