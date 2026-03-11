/**
 * Tool handlers for memory_search, memory_get, and memory_write
 * Wraps MemorySystem methods as ToolHandler functions
 * See: docs/disclaw/04-memory-system.md
 */

import type { ToolCall, MemoryWriteRequest } from "@disclaw/types";
import type { MemorySystem } from "@disclaw/memory";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

/** Create all memory-related tool handlers bound to a MemorySystem instance */
export function createMemoryToolHandlers(
  memory: MemorySystem,
  agentId: string,
): Map<string, ToolHandler> {
  const handlers = new Map<string, ToolHandler>();

  /** memory_search — semantic search over indexed memory files */
  handlers.set("memory_search", async (toolCall) => {
    const { query, limit } = toolCall.input as { query: string; limit?: number };
    const results = memory.search({ query, limit });
    return JSON.stringify(results, null, 2);
  });

  /** memory_get — read a specific memory file or line range */
  handlers.set("memory_get", async (toolCall) => {
    const { filename, lines } = toolCall.input as {
      filename: string;
      lines?: [number, number];
    };
    const result = memory.get({ filename, lines });
    return result.content;
  });

  /** memory_write — append daily, update section, or write file */
  handlers.set("memory_write", async (toolCall) => {
    const { action, content, target } = toolCall.input as unknown as MemoryWriteRequest;

    switch (action) {
      case "append_daily":
        memory.appendDaily(content);
        return "Appended to today's daily log.";

      case "update_section":
        if (!target) {
          return "Error: 'target' (section name) is required for update_section.";
        }
        memory.updateMemory(target, content);
        return `Updated MEMORY.md section: ${target}`;

      case "write_file":
        if (!target) {
          return "Error: 'target' (filename) is required for write_file.";
        }
        memory.writeFile(target, content);
        return `Wrote file: ${target}`;

      default:
        return `Error: Unknown action '${action}'. Use append_daily, update_section, or write_file.`;
    }
  });

  return handlers;
}
