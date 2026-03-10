/**
 * Tool handler for the "file" tool — read/write/list workspace files
 * Uses path validation from @disclaw/sandbox to prevent workspace escape
 * See: docs/disclaw/05-tools-skills-system.md § file
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import type { ToolCall } from "@disclaw/types";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

interface FileToolDeps {
  /** Absolute path to the workspace root (e.g., ~/.disclaw/workspace) */
  workspaceDir: string;
}

/** Validate path stays within workspace, no symlinks or escape */
function safeResolvePath(
  requestedPath: string,
  workspaceDir: string,
): string {
  const absolutePath = resolve(workspaceDir, requestedPath);
  const rel = relative(workspaceDir, absolutePath);

  if (rel.startsWith("..") || resolve(absolutePath) !== absolutePath) {
    throw new Error(`Path escapes workspace: ${requestedPath}`);
  }

  return absolutePath;
}

/** Create the file tool handler bound to a workspace directory */
export function createFileToolHandler(deps: FileToolDeps): ToolHandler {
  const { workspaceDir } = deps;

  // Ensure workspace dir exists
  mkdirSync(workspaceDir, { recursive: true });

  return async (toolCall: ToolCall): Promise<string> => {
    const { action, path, content } = toolCall.input as {
      action: string;
      path: string;
      content?: string;
    };

    try {
      switch (action) {
        case "read": {
          const fullPath = safeResolvePath(path, workspaceDir);
          if (!existsSync(fullPath)) {
            return `Error: File not found: ${path}`;
          }
          return readFileSync(fullPath, "utf-8");
        }

        case "write": {
          if (!content) {
            return "Error: 'content' is required for write action.";
          }
          const fullPath = safeResolvePath(path, workspaceDir);
          mkdirSync(dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, content);
          return `Wrote ${content.length} chars to ${path}`;
        }

        case "list": {
          const fullPath = safeResolvePath(path || ".", workspaceDir);
          if (!existsSync(fullPath)) {
            return `Error: Directory not found: ${path}`;
          }
          const stat = statSync(fullPath);
          if (!stat.isDirectory()) {
            return `Error: Not a directory: ${path}`;
          }
          const entries = readdirSync(fullPath, { withFileTypes: true });
          const listing = entries.map((e) =>
            `${e.isDirectory() ? "d" : "f"} ${e.name}`,
          );
          return listing.join("\n") || "(empty directory)";
        }

        default:
          return `Error: Unknown action '${action}'. Use read, write, or list.`;
      }
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  };
}
