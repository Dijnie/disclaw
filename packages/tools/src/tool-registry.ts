/**
 * Tool and skill registry management
 * See: docs/disclaw/05-tools-skills-system.md § Registry
 */

import type { ToolDefinition, SkillDefinition } from "@disclaw/types";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private skills = new Map<string, SkillDefinition>();

  /** Register a tool definition */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /** Register a skill definition */
  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  /** Get a tool by name */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** Get a skill by name */
  getSkill(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /** Get all tools */
  getAllTools(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  /** Get all skills */
  getAllSkills(): SkillDefinition[] {
    return [...this.skills.values()];
  }

  /** Get skills matching a tag */
  getSkillsByTag(tag: string): SkillDefinition[] {
    return [...this.skills.values()].filter((s) => s.tags.includes(tag));
  }

  /** Check if a tool can be executed (based on config enabled state) */
  canExecute(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}
