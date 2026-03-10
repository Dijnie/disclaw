/**
 * Find and parse SKILL.md files from configured paths
 * See: docs/disclaw/05-tools-skills-system.md § Skill System
 *
 * Precedence: workspace > user > bundled
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

import type { SkillDefinition } from "@disclaw/types";

interface SkillFrontmatter {
  name: string;
  version: string;
  description: string;
  tags?: string[];
  tools?: string[];
}

/** Parse YAML frontmatter from a SKILL.md file */
function parseSkillFile(filePath: string): SkillDefinition | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      console.warn(`[skill-loader] No frontmatter in ${filePath}`);
      return null;
    }

    const meta = yaml.load(frontmatterMatch[1]!) as SkillFrontmatter;
    const content = frontmatterMatch[2]!.trim();

    if (!meta.name || !meta.version || !meta.description) {
      console.warn(`[skill-loader] Missing required fields in ${filePath}`);
      return null;
    }

    return {
      name: meta.name,
      version: meta.version,
      description: meta.description,
      tags: meta.tags ?? [],
      tools: meta.tools ?? [],
      content,
    };
  } catch {
    console.warn(`[skill-loader] Failed to parse ${filePath}`);
    return null;
  }
}

/** Search a directory for SKILL.md files (one level deep) */
function findSkillFiles(dirPath: string): string[] {
  if (!existsSync(dirPath)) return [];

  const paths: string[] = [];
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(dirPath, entry.name, "SKILL.md");
        if (existsSync(skillPath)) {
          paths.push(skillPath);
        }
      }
    }
  } catch {
    // Directory not readable
  }
  return paths;
}

export interface SkillPaths {
  /** Agent workspace skills: ~/.disclaw/agents/{agentId}/skills/ */
  workspace?: string;
  /** User global skills: ~/.disclaw/skills/ */
  user?: string;
  /** Bundled skills in package */
  bundled?: string;
}

/**
 * Load all skills from configured paths (workspace > user > bundled precedence)
 * Later paths are overridden by earlier paths with the same skill name
 */
export function loadSkills(paths: SkillPaths): SkillDefinition[] {
  const skillMap = new Map<string, SkillDefinition>();

  // Load in reverse precedence order (bundled first, workspace last wins)
  const searchPaths = [paths.bundled, paths.user, paths.workspace].filter(
    Boolean,
  ) as string[];

  for (const searchPath of searchPaths) {
    const files = findSkillFiles(searchPath);
    for (const file of files) {
      const skill = parseSkillFile(file);
      if (skill) {
        skillMap.set(skill.name, skill);
      }
    }
  }

  return [...skillMap.values()];
}
