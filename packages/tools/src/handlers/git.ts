/**
 * Tool handler for the "git" tool — version control operations
 * Restricts to safe git commands (status, log, diff, add, commit, push)
 * See: docs/disclaw/05-tools-skills-system.md § git
 */

import { execFile } from "node:child_process";
import type { ToolCall } from "@disclaw/types";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

/** Allowed git subcommands — prevents arbitrary command injection */
const ALLOWED_COMMANDS = new Set(["status", "log", "diff", "add", "commit", "push"]);

interface GitToolDeps {
  /** Working directory for git operations */
  workspaceDir: string;
}

/** Run a git command and return stdout/stderr */
function runGit(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, timeout: 15_000 }, (err, stdout, stderr) => {
      if (err) {
        // Git often writes useful info to stderr on non-zero exit
        const output = stderr || stdout || err.message;
        resolve(`[error] ${output.trim()}`);
        return;
      }
      resolve((stdout + (stderr ? `\n[stderr] ${stderr}` : "")).trim());
    });
  });
}

/** Create the git tool handler bound to a workspace directory */
export function createGitToolHandler(deps: GitToolDeps): ToolHandler {
  const { workspaceDir } = deps;

  return async (toolCall: ToolCall): Promise<string> => {
    const { command, args } = toolCall.input as {
      command: string;
      args?: string;
    };

    if (!ALLOWED_COMMANDS.has(command)) {
      return `Error: Git command '${command}' is not allowed. Allowed: ${[...ALLOWED_COMMANDS].join(", ")}`;
    }

    // Build git args array — split additional args safely
    const gitArgs = [command];
    if (args) {
      gitArgs.push(...args.split(/\s+/).filter(Boolean));
    }

    return runGit(workspaceDir, gitArgs);
  };
}
