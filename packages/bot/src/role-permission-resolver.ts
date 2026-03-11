/**
 * Role-based permission resolver
 * Resolves Discord userId → role → tool permissions
 *
 * Gate 1: allowlist-filter.ts (can user talk to bot?)
 * Gate 2: this module (what tools can user access?)
 *
 * If no roles configured → all users get all tools (backward compatible)
 * If roles configured but user not in any role → falls back to "user" role
 * If "user" role not defined → no tool access (deny by default)
 */

import type { RoleConfig } from "@disclaw/types";

/** Resolved permissions for a specific user */
export interface ResolvedPermissions {
  /** Role name assigned to the user */
  role: string;
  /** Set of allowed tool names, or "*" for all tools */
  allowedTools: Set<string> | "*";
  /** Whether approval gates are skipped for this role */
  skipApproval: boolean;
}

/** Resolve which role a user belongs to */
export function resolveUserRole(
  userId: string,
  roles?: Record<string, RoleConfig>,
): string {
  if (!roles) return "user";

  for (const [roleName, config] of Object.entries(roles)) {
    if (config.users?.includes(userId)) return roleName;
  }

  return "user";
}

/** Resolve full permissions for a user based on their role */
export function resolvePermissions(
  userId: string,
  roles?: Record<string, RoleConfig>,
): ResolvedPermissions {
  // No roles configured → allow everything (backward compatible)
  if (!roles) {
    return { role: "user", allowedTools: "*", skipApproval: false };
  }

  const role = resolveUserRole(userId, roles);
  const roleConfig = roles[role];

  // Role not defined in config → deny all tools
  if (!roleConfig) {
    return { role, allowedTools: new Set(), skipApproval: false };
  }

  return {
    role,
    allowedTools:
      roleConfig.tools === "*" ? "*" : new Set(roleConfig.tools),
    skipApproval: roleConfig.skipApproval ?? false,
  };
}

/** Check if a specific tool is allowed for the given permissions */
export function isToolAllowed(
  toolName: string,
  permissions: ResolvedPermissions,
): boolean {
  if (permissions.allowedTools === "*") return true;
  return permissions.allowedTools.has(toolName);
}

/**
 * Filter a tools map to only include tools allowed by permissions.
 * Returns a new Map with only the permitted tools.
 */
export function filterToolsByPermissions<T>(
  tools: Map<string, T>,
  permissions: ResolvedPermissions,
): Map<string, T> {
  if (permissions.allowedTools === "*") return tools;

  const filtered = new Map<string, T>();
  for (const [name, def] of tools) {
    if (permissions.allowedTools.has(name)) {
      filtered.set(name, def);
    }
  }
  return filtered;
}
