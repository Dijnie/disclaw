/**
 * Approval gate — requests user approval for dangerous tool calls
 * See: docs/disclaw/08-security-sandbox.md
 *
 * Sends a Discord message with Approve/Deny buttons via the provider,
 * awaits user interaction, and returns boolean result.
 */

import type { ToolCall } from "@disclaw/types";
import type { Provider } from "@disclaw/bot";

export interface ApprovalGateOptions {
  provider: Provider;
  channelId: string;
  userId: string;
  timeoutMs?: number;
}

const MAX_PREVIEW_LENGTH = 200;

/** Format a tool call into a human-readable approval message */
function formatApprovalMessage(toolCall: ToolCall): string {
  const input = JSON.stringify(toolCall.input);
  const preview = input.length > MAX_PREVIEW_LENGTH
    ? input.slice(0, MAX_PREVIEW_LENGTH) + "..."
    : input;

  return [
    `**Tool Approval Required**`,
    `Tool: \`${toolCall.toolName}\``,
    `Input: \`\`\`${preview}\`\`\``,
    `React to approve or deny execution.`,
  ].join("\n");
}

/** Request user approval for a tool call via Discord buttons */
export async function requestApproval(
  toolCall: ToolCall,
  options: ApprovalGateOptions,
): Promise<boolean> {
  const { provider, channelId, userId, timeoutMs = 60_000 } = options;

  const content = formatApprovalMessage(toolCall);

  try {
    const approved = await provider.sendApprovalRequest(
      channelId,
      content,
      userId,
      timeoutMs,
    );
    console.log(
      `[approval] Tool "${toolCall.toolName}" ${approved ? "APPROVED" : "DENIED"} by user ${userId}`,
    );
    return approved;
  } catch (err) {
    console.error("[approval] Failed to request approval:", err);
    return false; // Fail-closed
  }
}
