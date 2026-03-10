/**
 * memory_get tool — targeted read of specific memory file/line range
 * See: docs/disclaw/04-memory-system.md § Memory Tools
 */

import type { MemoryGetRequest, MemoryGetResult } from "@disclaw/types";
import { readMemoryFile } from "./memory-loader.js";

/** Read a specific memory file or line range */
export function memoryGet(
  agentDir: string,
  request: MemoryGetRequest,
): MemoryGetResult {
  const content = readMemoryFile(agentDir, request.filename, request.lines);
  return { content };
}
