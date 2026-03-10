/**
 * memory_search tool — semantic recall over indexed memory
 * See: docs/disclaw/04-memory-system.md § Memory Tools
 */

import type { MemorySearchRequest, MemorySearchResult } from "@disclaw/types";
import type { VectorIndexer } from "./vector-indexer.js";

/** Execute a memory search query against the vector index */
export function memorySearch(
  indexer: VectorIndexer,
  agentId: string,
  request: MemorySearchRequest,
): MemorySearchResult[] {
  const limit = request.limit ?? 5;
  const chunks = indexer.search(agentId, request.query, limit);

  return chunks.map((chunk) => ({
    filename: chunk.filename,
    snippet: chunk.content,
    // Keyword-based fallback returns 0.5 as placeholder similarity
    similarity: 0.5,
    lineRange: [chunk.startLine, chunk.endLine] as [number, number],
  }));
}
