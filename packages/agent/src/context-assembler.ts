/**
 * Build LLM context from session history + memory layers + skills
 * See: docs/disclaw/03-agent-runtime.md § Context Assembly
 */

import type { AssembledContext, Message, MemoryFile } from "@disclaw/types";

export interface ContextAssemblerInput {
  memoryFiles: MemoryFile[];
  history: Message[];
  activeSkills: string[];
  activeTools: string[];
  /** Max total chars for context (approximate token budget) */
  maxContextChars?: number;
}

/** Build the system prompt from SOUL.md and AGENTS.md */
function buildSystemPrompt(memoryFiles: MemoryFile[]): string {
  const parts: string[] = [];

  const soul = memoryFiles.find((f) => f.layer === "soul");
  if (soul) parts.push(soul.content);

  const agents = memoryFiles.find((f) => f.layer === "agents");
  if (agents) parts.push(agents.content);

  const longTermMemory = memoryFiles.find((f) => f.layer === "memory");
  if (longTermMemory) parts.push(`\n---\n\n${longTermMemory.content}`);

  const dailyLogs = memoryFiles.filter((f) => f.layer === "daily");
  for (const log of dailyLogs) {
    parts.push(`\n---\n\n${log.content}`);
  }

  return parts.join("\n\n");
}

/** Assemble full context for LLM call */
export function assembleContext(
  input: ContextAssemblerInput,
): AssembledContext {
  const systemPrompt = buildSystemPrompt(input.memoryFiles);

  // Truncate history if over budget (oldest first)
  let messages = [...input.history];
  const maxChars = input.maxContextChars ?? 150000;
  let totalChars =
    systemPrompt.length +
    messages.reduce((sum, m) => sum + m.content.length, 0);

  while (totalChars > maxChars && messages.length > 1) {
    const removed = messages.shift()!;
    totalChars -= removed.content.length;
  }

  return {
    systemPrompt,
    messages,
    tools: input.activeTools,
    skills: input.activeSkills,
  };
}
