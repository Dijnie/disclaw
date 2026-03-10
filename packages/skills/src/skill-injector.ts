/**
 * Inject matching skills into agent context per turn
 * See: docs/disclaw/05-tools-skills-system.md § Skill Injection
 */

import type { SkillDefinition } from "@disclaw/types";

/** Filter skills that match the active tool set */
export function matchSkills(
  skills: SkillDefinition[],
  activeTools: string[],
): SkillDefinition[] {
  return skills.filter((skill) => {
    // If skill has no tool requirements, always include
    if (skill.tools.length === 0) return true;
    // Include if any required tool is available
    return skill.tools.some((t) => activeTools.includes(t));
  });
}

/** Build skill instructions for system prompt injection */
export function buildSkillInstructions(skills: SkillDefinition[]): string {
  if (skills.length === 0) return "";

  const sections = skills.map(
    (s) => `### Skill: ${s.name} (v${s.version})\n${s.content}`,
  );

  return `## Active Skills\n\n${sections.join("\n\n")}`;
}
