/**
 * Tool and skill type definitions
 * See: docs/disclaw/05-tools-skills-system.md
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresApproval: boolean;
}

export interface ToolCall {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  isError: boolean;
}

export interface SkillDefinition {
  name: string;
  version: string;
  description: string;
  tags: string[];
  tools: string[];
  content: string;
}
