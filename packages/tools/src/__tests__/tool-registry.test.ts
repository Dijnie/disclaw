import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../tool-registry.js";
import type { ToolDefinition, SkillDefinition } from "@disclaw/types";

describe("ToolRegistry", () => {
  it("registers and retrieves a tool", () => {
    const registry = new ToolRegistry();
    const tool: ToolDefinition = {
      name: "bash",
      description: "Run bash",
      inputSchema: {},
      requiresApproval: true,
    };
    registry.registerTool(tool);
    expect(registry.getTool("bash")).toEqual(tool);
  });

  it("returns undefined for unknown tool", () => {
    const registry = new ToolRegistry();
    expect(registry.getTool("nope")).toBeUndefined();
  });

  it("lists all registered tools", () => {
    const registry = new ToolRegistry();
    registry.registerTool({ name: "a", description: "", inputSchema: {}, requiresApproval: false });
    registry.registerTool({ name: "b", description: "", inputSchema: {}, requiresApproval: false });
    expect(registry.getAllTools()).toHaveLength(2);
  });

  it("registers and retrieves skills", () => {
    const registry = new ToolRegistry();
    const skill: SkillDefinition = {
      name: "summarize",
      version: "1.0",
      description: "Summarize text",
      tags: ["text", "ai"],
      tools: [],
      content: "...",
    };
    registry.registerSkill(skill);
    expect(registry.getSkill("summarize")).toEqual(skill);
  });

  it("filters skills by tag", () => {
    const registry = new ToolRegistry();
    registry.registerSkill({
      name: "s1", version: "1", description: "", tags: ["ai"], tools: [], content: "",
    });
    registry.registerSkill({
      name: "s2", version: "1", description: "", tags: ["web"], tools: [], content: "",
    });
    expect(registry.getSkillsByTag("ai")).toHaveLength(1);
    expect(registry.getSkillsByTag("ai")[0]!.name).toBe("s1");
  });

  it("canExecute returns true only for registered tools", () => {
    const registry = new ToolRegistry();
    registry.registerTool({ name: "file", description: "", inputSchema: {}, requiresApproval: false });
    expect(registry.canExecute("file")).toBe(true);
    expect(registry.canExecute("missing")).toBe(false);
  });
});
