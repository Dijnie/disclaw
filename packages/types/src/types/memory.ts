/**
 * Memory system types
 * See: docs/disclaw/04-memory-system.md
 */

export interface MemorySearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface MemorySearchResult {
  filename: string;
  snippet: string;
  similarity: number;
  lineRange: [number, number];
}

export interface MemoryGetRequest {
  filename: string;
  lines?: [number, number];
}

export interface MemoryGetResult {
  content: string;
}

export interface MemoryWriteRequest {
  action: "append_daily" | "update_section" | "write_file";
  /** Content to write */
  content: string;
  /** Section name (for update_section) or filename (for write_file) */
  target?: string;
}

/** Memory layer types for context assembly */
export type MemoryLayer = "soul" | "agents" | "memory" | "daily";

export interface MemoryFile {
  layer: MemoryLayer;
  filename: string;
  content: string;
  lastModified: Date;
}
