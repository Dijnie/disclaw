/**
 * Execute tool calls with approval gates
 * See: docs/disclaw/03-agent-runtime.md § Tool Execution
 */

import type { ToolCall, ToolResult, ToolDefinition } from "@disclaw/types";

export type ApprovalHandler = (toolCall: ToolCall) => Promise<boolean>;
export type ToolHandler = (
  toolCall: ToolCall,
) => Promise<string>;

export interface ToolExecutorOptions {
  tools: Map<string, ToolDefinition>;
  handlers: Map<string, ToolHandler>;
  onApprovalRequired: ApprovalHandler;
  timeoutMs?: number;
}

/** Execute a tool call, checking approval if required */
export async function executeTool(
  toolCall: ToolCall,
  options: ToolExecutorOptions,
): Promise<ToolResult> {
  const definition = options.tools.get(toolCall.toolName);
  if (!definition) {
    return {
      toolCallId: toolCall.toolCallId,
      output: `Unknown tool: ${toolCall.toolName}`,
      isError: true,
    };
  }

  // Check if approval is needed
  if (definition.requiresApproval) {
    const approved = await options.onApprovalRequired(toolCall);
    if (!approved) {
      return {
        toolCallId: toolCall.toolCallId,
        output: "Tool execution denied by user",
        isError: true,
      };
    }
  }

  // Execute with timeout
  const handler = options.handlers.get(toolCall.toolName);
  if (!handler) {
    return {
      toolCallId: toolCall.toolCallId,
      output: `No handler registered for tool: ${toolCall.toolName}`,
      isError: true,
    };
  }

  const timeoutMs = options.timeoutMs ?? 30000;

  try {
    const result = await Promise.race([
      handler(toolCall),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tool execution timeout")), timeoutMs),
      ),
    ]);
    return {
      toolCallId: toolCall.toolCallId,
      output: result,
      isError: false,
    };
  } catch (err) {
    return {
      toolCallId: toolCall.toolCallId,
      output: err instanceof Error ? err.message : String(err),
      isError: true,
    };
  }
}
