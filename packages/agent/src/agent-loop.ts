/**
 * Main agent loop orchestrator
 * See: docs/disclaw/03-agent-runtime.md § Agent Loop
 *
 * Loop: receive → context assembly → LLM call → tool execution → reply → persist
 * Max iterations guard prevents infinite tool loops (default 10)
 */

import Anthropic from "@anthropic-ai/sdk";

import type {
  InboundContext,
  DisclawConfig,
  Message,
  ToolCall,
  ToolResult,
  ToolDefinition,
  MemoryFile,
} from "@disclaw/types";
import { assembleContext } from "./context-assembler.js";
import {
  executeTool,
  type ToolHandler,
  type ApprovalHandler,
} from "./tool-executor.js";
import { StreamHandler } from "./stream-handler.js";
import { classifyError } from "./error-handler.js";
import {
  resolvePermissions,
  filterToolsByPermissions,
} from "@disclaw/bot";

export interface AgentLoopOptions {
  config: DisclawConfig;
  agentId: string;
  /** Memory files loaded for this session */
  memoryFiles: MemoryFile[];
  /** Conversation history */
  history: Message[];
  /** Available tools */
  tools: Map<string, ToolDefinition>;
  /** Tool execution handlers */
  toolHandlers: Map<string, ToolHandler>;
  /** Active skill names */
  activeSkills: string[];
  /** Send reply to Discord */
  onReply: (content: string) => Promise<void>;
  /** Handle approval requests for dangerous tools */
  onApprovalRequired: ApprovalHandler;
  /** Persist conversation after completion */
  onPersist: (history: Message[]) => Promise<void>;
  /** Max loop iterations (default: 10) */
  maxIterations?: number;
}

/** Run a single agent turn for an inbound message */
export async function runAgentLoop(
  inbound: InboundContext,
  options: AgentLoopOptions,
): Promise<void> {
  const maxIterations = options.maxIterations ?? 10;
  const history = [...options.history];

  // Resolve role-based permissions for this user
  const permissions = resolvePermissions(
    inbound.userId,
    options.config.provider.roles,
  );
  // Filter tools to only those allowed by user's role
  const allowedTools = filterToolsByPermissions(options.tools, permissions);

  console.log(`[agent-loop] User ${inbound.userId} role="${permissions.role}", tools=${allowedTools.size}/${options.tools.size}`);

  // Add the user message to history
  history.push({
    role: "user",
    content: inbound.content,
    timestamp: inbound.timestamp,
  });

  // Assemble context (only expose allowed tools to LLM)
  const context = assembleContext({
    memoryFiles: options.memoryFiles,
    history,
    activeSkills: options.activeSkills,
    activeTools: [...allowedTools.keys()],
    maxContextChars: (options.config.agent.contextWindow ?? 200000) * 3,
  });

  // Create Anthropic client
  // Support any Anthropic-protocol-compatible API (DashScope, OpenRouter, etc.)
  // Priority: config providers > ANTHROPIC_* env vars > defaults
  const providerName = options.config.agent.provider ?? "anthropic";
  const providerConfig = options.config.providers?.[providerName];
  const apiKey = providerConfig?.apiKey
    ?? process.env["ANTHROPIC_AUTH_TOKEN"]
    ?? process.env["ANTHROPIC_API_KEY"]
    ?? "";
  const baseURL = providerConfig?.baseUrl
    ?? process.env["ANTHROPIC_BASE_URL"];
  const client = new Anthropic({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  // Build tool definitions for Anthropic API (only allowed tools)
  const toolDefs = [...allowedTools.values()].map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
  }));

  // Stream handler for progressive Discord replies
  const streamer = new StreamHandler({
    onSend: options.onReply,
  });

  let iteration = 0;

  // Build initial messages from context — then accumulate across iterations
  const apiMessages: Anthropic.MessageParam[] = context.messages.map(
    (m) => ({
      role: (m.role === "system" ? "user" : m.role) as "user" | "assistant",
      content: m.content,
    }),
  );

  while (iteration < maxIterations) {
    iteration++;
    console.log(`[agent-loop] Iteration ${iteration}/${maxIterations}, messages=${apiMessages.length}`);

    try {
      // Call LLM (streaming) — ANTHROPIC_MODEL env var overrides config
      const model = process.env["ANTHROPIC_MODEL"] ?? options.config.agent.model;
      const stream = client.messages.stream({
        model,
        max_tokens: options.config.agent.maxTokens ?? 4096,
        temperature: options.config.agent.temperature ?? 0.7,
        system: context.systemPrompt,
        messages: apiMessages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      });

      const response = await stream.finalMessage();
      console.log(`[agent-loop] Response: stop_reason=${response.stop_reason}, blocks=${response.content.length}`);

      // Append full assistant response to message history (including tool_use blocks)
      apiMessages.push({ role: "assistant", content: response.content });

      // Process response content blocks
      let hasToolUse = false;
      let textContent = "";
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          textContent += block.text;
          await streamer.push(block.text);
        } else if (block.type === "tool_use") {
          hasToolUse = true;

          const toolCall: ToolCall = {
            toolName: block.name,
            toolCallId: block.id,
            input: block.input as Record<string, unknown>,
          };

          console.log(`[agent-loop] Tool call: ${block.name}`, JSON.stringify(block.input).slice(0, 200));

          const result: ToolResult = await executeTool(toolCall, {
            tools: allowedTools,
            handlers: options.toolHandlers,
            onApprovalRequired: options.onApprovalRequired,
            permissions,
          });

          console.log(`[agent-loop] Tool result: ${result.isError ? "ERROR" : "OK"} — ${result.output.slice(0, 200)}`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: result.toolCallId,
            content: result.output,
          });
        }
      }

      // Flush remaining streamed content
      await streamer.flush();

      // If no tool use, we're done
      if (!hasToolUse) {
        // Add assistant response to conversation history for persistence
        if (textContent) {
          history.push({
            role: "assistant",
            content: textContent,
            timestamp: new Date(),
          });
        }
        break;
      }

      // Append tool results as user message for next iteration
      apiMessages.push({ role: "user", content: toolResults });
    } catch (err) {
      const classified = classifyError(err);
      console.error(`[agent-loop] ${classified.type} error:`, classified.message);
      await options.onReply(classified.userMessage);
      break;
    }
  }

  if (iteration >= maxIterations) {
    await options.onReply(
      "I've reached my processing limit for this request. Please try again with a simpler question.",
    );
  }

  // Persist conversation
  await options.onPersist(history);
}
