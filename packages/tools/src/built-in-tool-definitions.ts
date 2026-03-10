/**
 * Built-in tool definitions in LLM tool_use format
 * See: docs/disclaw/05-tools-skills-system.md § Built-in Tools
 */

import type { ToolDefinition } from "@disclaw/types";

export const bashTool: ToolDefinition = {
  name: "bash",
  description: "Execute a bash command in a sandboxed environment",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The bash command to execute" },
      timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
    },
    required: ["command"],
  },
  requiresApproval: true,
};

export const browserTool: ToolDefinition = {
  name: "browser",
  description: "Browse a URL and return the page content",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to browse" },
      action: {
        type: "string",
        enum: ["get", "screenshot"],
        description: "Action to perform",
      },
    },
    required: ["url"],
  },
  requiresApproval: false,
};

export const fileTool: ToolDefinition = {
  name: "file",
  description: "Read or write files in the workspace directory",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["read", "write", "list"],
        description: "File operation to perform",
      },
      path: { type: "string", description: "File path relative to workspace" },
      content: { type: "string", description: "Content to write (for write action)" },
    },
    required: ["action", "path"],
  },
  requiresApproval: false,
};

export const memorySearchTool: ToolDefinition = {
  name: "memory_search",
  description: "Search agent memory using semantic similarity",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Natural language search query" },
      limit: { type: "number", description: "Max results (default: 5)" },
    },
    required: ["query"],
  },
  requiresApproval: false,
};

export const memoryGetTool: ToolDefinition = {
  name: "memory_get",
  description: "Read a specific memory file or line range",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string", description: "File to read (e.g., MEMORY.md)" },
      lines: {
        type: "array",
        items: { type: "number" },
        description: "Optional [start, end] line range",
      },
    },
    required: ["filename"],
  },
  requiresApproval: false,
};

export const canvasTool: ToolDefinition = {
  name: "canvas",
  description: "Generate or manipulate images",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "edit"],
        description: "Canvas operation",
      },
      prompt: { type: "string", description: "Image generation prompt" },
      path: { type: "string", description: "Output file path" },
    },
    required: ["action", "prompt"],
  },
  requiresApproval: false,
};

export const cronTool: ToolDefinition = {
  name: "cron",
  description: "Schedule or manage recurring tasks",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "remove", "list"],
        description: "Cron operation",
      },
      schedule: { type: "string", description: "Schedule expression (at/every/cron)" },
      taskName: { type: "string", description: "Task identifier" },
    },
    required: ["action"],
  },
  requiresApproval: false,
};

export const gitTool: ToolDefinition = {
  name: "git",
  description: "Execute git operations in the workspace",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        enum: ["status", "log", "diff", "add", "commit", "push"],
        description: "Git command to execute",
      },
      args: { type: "string", description: "Additional arguments" },
    },
    required: ["command"],
  },
  requiresApproval: true,
};

/** All built-in tool definitions */
export const builtInTools: ToolDefinition[] = [
  bashTool,
  browserTool,
  fileTool,
  memorySearchTool,
  memoryGetTool,
  canvasTool,
  cronTool,
  gitTool,
];
