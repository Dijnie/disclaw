/**
 * Error classification and user-friendly messages
 * See: docs/disclaw/03-agent-runtime.md § Error Handling
 */

export type ErrorType = "llm" | "tool" | "sandbox" | "unknown";

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  userMessage: string;
  original: unknown;
}

/** Classify an error and produce a user-friendly message */
export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof Error) {
    // LLM errors (API errors, rate limits)
    if (
      err.message.includes("API") ||
      err.message.includes("rate") ||
      err.message.includes("anthropic") ||
      err.message.includes("401") ||
      err.message.includes("429")
    ) {
      return {
        type: "llm",
        message: err.message,
        userMessage: "I'm having trouble connecting to my AI provider. Please try again in a moment.",
        original: err,
      };
    }

    // Sandbox errors
    if (
      err.message.includes("sandbox") ||
      err.message.includes("docker") ||
      err.message.includes("container")
    ) {
      return {
        type: "sandbox",
        message: err.message,
        userMessage: "The execution sandbox is unavailable. Cannot run this operation safely.",
        original: err,
      };
    }

    // Tool errors
    if (
      err.message.includes("tool") ||
      err.message.includes("timeout") ||
      err.message.includes("denied")
    ) {
      return {
        type: "tool",
        message: err.message,
        userMessage: "A tool execution failed. Please check the operation and try again.",
        original: err,
      };
    }
  }

  return {
    type: "unknown",
    message: String(err),
    userMessage: "Something went wrong. Please try again.",
    original: err,
  };
}
