/**
 * Execute tool calls with approval gates and role-based permissions
 * See: docs/disclaw/03-agent-runtime.md § Tool Execution
 */

import type { ToolCall, ToolResult, ToolDefinition } from "@disclaw/types";
import type { ResolvedPermissions } from "@disclaw/bot";

export type ApprovalHandler = (toolCall: ToolCall) => Promise<boolean>;
export type ToolHandler = (
  toolCall: ToolCall,
) => Promise<string>;

export interface ToolExecutorOptions {
  tools: Map<string, ToolDefinition>;
  handlers: Map<string, ToolHandler>;
  onApprovalRequired: ApprovalHandler;
  /** User's resolved role permissions (if undefined, all tools allowed) */
  permissions?: ResolvedPermissions;
  timeoutMs?: number;
}

/** Execute a tool call, checking role permissions and approval if required */
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

  // Gate 2: Role-based permission check
  if (options.permissions) {
    const { allowedTools, skipApproval } = options.permissions;
    const allowed =
      allowedTools === "*" || allowedTools.has(toolCall.toolName);
    if (!allowed) {
      return {
        toolCallId: toolCall.toolCallId,
        output: `Permission denied: role "${options.permissions.role}" cannot use tool "${toolCall.toolName}"`,
        isError: true,
      };
    }

    // Skip approval gate if role has skipApproval
    if (!skipApproval && definition.requiresApproval) {
      const approved = await options.onApprovalRequired(toolCall);
      if (!approved) {
        return {
          toolCallId: toolCall.toolCallId,
          output: "Tool execution denied by user",
          isError: true,
        };
      }
    }
  } else if (definition.requiresApproval) {
    // No permissions configured — use original approval check
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
