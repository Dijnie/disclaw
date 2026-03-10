/**
 * Load memory layers per session type
 * See: docs/disclaw/04-memory-system.md § Memory Layers
 *
 * Main session: SOUL.md + AGENTS.md + MEMORY.md + today + yesterday daily logs
 * Cron/heartbeat: SOUL.md + AGENTS.md + today daily log (no MEMORY.md)
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { MemoryFile, MemoryLayer } from "@disclaw/types";

export type SessionType = "main" | "cron" | "heartbeat";

/** Format date as YYYY-MM-DD for daily log filenames */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Safely read a file, returning empty string if missing */
function safeRead(path: string): string {
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf-8");
}

/** Load a single memory file with metadata */
function loadFile(
  agentDir: string,
  filename: string,
  layer: MemoryLayer,
): MemoryFile | null {
  const fullPath = join(agentDir, filename);
  if (!existsSync(fullPath)) return null;

  const content = readFileSync(fullPath, "utf-8");
  return {
    layer,
    filename,
    content,
    lastModified: new Date(),
  };
}

/** Load all memory layers for a given session type */
export function loadMemoryLayers(
  agentDir: string,
  sessionType: SessionType,
): MemoryFile[] {
  const files: MemoryFile[] = [];

  // Always load SOUL.md and AGENTS.md
  const soul = loadFile(agentDir, "SOUL.md", "soul");
  if (soul) files.push(soul);

  const agents = loadFile(agentDir, "AGENTS.md", "agents");
  if (agents) files.push(agents);

  // Main session gets MEMORY.md; cron/heartbeat do not
  if (sessionType === "main") {
    const memory = loadFile(agentDir, "MEMORY.md", "memory");
    if (memory) files.push(memory);
  }

  // Load today + yesterday daily logs
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayLog = loadFile(
    agentDir,
    `memory/${formatDate(today)}.md`,
    "daily",
  );
  if (todayLog) files.push(todayLog);

  // Main session also gets yesterday's log
  if (sessionType === "main") {
    const yesterdayLog = loadFile(
      agentDir,
      `memory/${formatDate(yesterday)}.md`,
      "daily",
    );
    if (yesterdayLog) files.push(yesterdayLog);
  }

  return files;
}

/** Read a specific memory file or line range */
export function readMemoryFile(
  agentDir: string,
  filename: string,
  lines?: [number, number],
): string {
  const fullPath = join(agentDir, filename);
  const content = safeRead(fullPath);

  if (!lines) return content;

  const allLines = content.split("\n");
  const [start, end] = lines;
  return allLines.slice(start - 1, end).join("\n");
}
