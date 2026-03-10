/**
 * Agent session context — gateway → agent communication
 * See: docs/disclaw/03-agent-runtime.md
 */

import type { ToolCall, ToolResult } from "./tool.js";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface SessionContext {
  sessionKey: string;
  agentId: string;
  userId: string;
  guildId?: string;
  channelId?: string;
  messageId: string;
  history: Message[];
  memory: {
    search(query: string): Promise<string[]>;
    get(filename: string): Promise<string>;
  };
  onToolCall(toolCall: ToolCall): Promise<ToolResult>;
  onReply(content: string): Promise<void>;
  onApprovalRequired(toolCall: ToolCall): Promise<boolean>;
}

/** Assembled context ready for LLM call */
export interface AssembledContext {
  systemPrompt: string;
  messages: Message[];
  tools: string[];
  skills: string[];
}
