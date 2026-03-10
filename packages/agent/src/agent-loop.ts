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

  // Add the user message to history
  history.push({
    role: "user",
    content: inbound.content,
    timestamp: inbound.timestamp,
  });

  // Assemble context
  const context = assembleContext({
    memoryFiles: options.memoryFiles,
    history,
    activeSkills: options.activeSkills,
    activeTools: [...options.tools.keys()],
    maxContextChars: (options.config.agent.contextWindow ?? 200000) * 3,
  });

  // Create Anthropic client
  const anthropicConfig = options.config.providers?.["anthropic"];
  const client = new Anthropic({
    apiKey: anthropicConfig?.apiKey ?? process.env["ANTHROPIC_API_KEY"] ?? "",
  });

  // Build tool definitions for Anthropic API
  const toolDefs = [...options.tools.values()].map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool["input_schema"],
  }));

  // Stream handler for progressive Discord replies
  const streamer = new StreamHandler({
    onSend: options.onReply,
  });

  let iteration = 0;
  let toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

  while (iteration < maxIterations) {
    iteration++;

    try {
      // Build messages for API call
      const apiMessages: Anthropic.MessageParam[] = context.messages.map(
        (m) => ({
          role: m.role === "system" ? "user" : m.role,
          content: m.content,
        }),
      );

      // Append tool results if any
      if (toolResults.length > 0) {
        apiMessages.push({ role: "user", content: toolResults });
        toolResults = [];
      }

      // Call LLM (streaming)
      const stream = client.messages.stream({
        model: options.config.agent.model,
        max_tokens: options.config.agent.maxTokens ?? 4096,
        temperature: options.config.agent.temperature ?? 0.7,
        system: context.systemPrompt,
        messages: apiMessages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      });

      const response = await stream.finalMessage();

      // Process response content blocks
      let hasToolUse = false;
      let textContent = "";

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

          const result: ToolResult = await executeTool(toolCall, {
            tools: options.tools,
            handlers: options.toolHandlers,
            onApprovalRequired: options.onApprovalRequired,
          });

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
        // Add assistant response to history
        if (textContent) {
          history.push({
            role: "assistant",
            content: textContent,
            timestamp: new Date(),
          });
        }
        break;
      }

      // If tool use, continue the loop (results will be sent in next iteration)
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
