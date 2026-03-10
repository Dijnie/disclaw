/**
 * Tool handler for the "bash" tool — execute commands via Docker sandbox
 * Fail-closed: rejects execution if sandbox is unavailable
 * See: docs/disclaw/05-tools-skills-system.md § bash
 */

import type { ToolCall } from "@disclaw/types";
import type { SandboxManager } from "@disclaw/sandbox";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

interface BashToolDeps {
  sandbox: SandboxManager;
}

/** Create the bash tool handler bound to a SandboxManager instance */
export function createBashToolHandler(deps: BashToolDeps): ToolHandler {
  const { sandbox } = deps;

  return async (toolCall: ToolCall): Promise<string> => {
    const { command, timeout } = toolCall.input as {
      command: string;
      timeout?: number;
    };

    if (!command || command.trim().length === 0) {
      return "Error: 'command' is required and cannot be empty.";
    }

    try {
      const result = await sandbox.execute(command);

      const parts: string[] = [];
      if (result.stdout) parts.push(result.stdout);
      if (result.stderr) parts.push(`[stderr] ${result.stderr}`);
      parts.push(`[exit code: ${result.exitCode}]`);

      return parts.join("\n");
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  };
}
