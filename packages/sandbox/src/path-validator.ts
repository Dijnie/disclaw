/**
 * File path validation — prevent workspace escape and deny list enforcement
 * See: docs/disclaw/08-security-sandbox.md § Path Validation
 */

import { resolve, relative } from "node:path";
import { lstatSync, existsSync } from "node:fs";

/** Validate that a path is within the workspace and not in deny list */
export function validatePath(
  requestedPath: string,
  workspaceDir: string,
  denyPaths: string[],
): { valid: boolean; reason?: string } {
  const absolutePath = resolve(workspaceDir, requestedPath);
  const relativePath = relative(workspaceDir, absolutePath);

  // Check for workspace escape (path starts with ..)
  if (relativePath.startsWith("..") || resolve(absolutePath) !== absolutePath) {
    return { valid: false, reason: "Path escapes workspace directory" };
  }

  // Check deny list
  for (const denied of denyPaths) {
    if (absolutePath.startsWith(denied) || absolutePath === denied) {
      return { valid: false, reason: `Path is in deny list: ${denied}` };
    }
  }

  // Check for symlink traversal
  if (existsSync(absolutePath)) {
    try {
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        return { valid: false, reason: "Symlink traversal blocked" };
      }
    } catch {
      // Cannot stat — allow (file might not exist yet for writes)
    }
  }

  return { valid: true };
}
