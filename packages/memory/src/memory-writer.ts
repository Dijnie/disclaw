/**
 * Write to MEMORY.md and daily logs
 * See: docs/disclaw/04-memory-system.md § Memory Write Protocol
 */

import {
  appendFileSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";

/** Format date as YYYY-MM-DD */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Append content to today's daily log (creates file if needed) */
export function appendToDaily(
  agentDir: string,
  date: Date,
  content: string,
): void {
  const filename = `memory/${formatDate(date)}.md`;
  const fullPath = join(agentDir, filename);

  // Ensure memory directory exists
  mkdirSync(dirname(fullPath), { recursive: true });

  if (!existsSync(fullPath)) {
    // Create daily log with header
    writeFileSync(fullPath, `# ${formatDate(date)} Daily Log\n\n${content}\n`);
  } else {
    appendFileSync(fullPath, `\n${content}\n`);
  }
}

/** Update a section in MEMORY.md (replace or append) */
export function updateMemorySection(
  agentDir: string,
  section: string,
  content: string,
): void {
  const fullPath = join(agentDir, "MEMORY.md");

  if (!existsSync(fullPath)) {
    writeFileSync(fullPath, `# Long-term Memory\n\n## ${section}\n${content}\n`);
    return;
  }

  const existing = readFileSync(fullPath, "utf-8");
  const sectionHeader = `## ${section}`;
  const sectionIndex = existing.indexOf(sectionHeader);

  if (sectionIndex === -1) {
    // Section doesn't exist — append
    writeFileSync(fullPath, `${existing.trimEnd()}\n\n${sectionHeader}\n${content}\n`);
  } else {
    // Find next section or end of file
    const afterHeader = sectionIndex + sectionHeader.length;
    const nextSection = existing.indexOf("\n## ", afterHeader);
    const endIndex = nextSection === -1 ? existing.length : nextSection;

    const before = existing.slice(0, sectionIndex);
    const after = existing.slice(endIndex);
    writeFileSync(fullPath, `${before}${sectionHeader}\n${content}\n${after}`);
  }
}

/** Write full content to a memory file */
export function writeMemoryFile(
  agentDir: string,
  filename: string,
  content: string,
): void {
  const fullPath = join(agentDir, filename);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}
