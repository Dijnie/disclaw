/**
 * Sandbox-specific error types
 * See: docs/disclaw/08-security-sandbox.md
 */

export class SandboxUnavailableError extends Error {
  constructor(message = "Docker sandbox is unavailable") {
    super(message);
    this.name = "SandboxUnavailableError";
  }
}

export class SandboxTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Sandbox execution timed out after ${timeoutMs}ms`);
    this.name = "SandboxTimeoutError";
  }
}

export class PathValidationError extends Error {
  constructor(path: string, reason: string) {
    super(`Path validation failed for "${path}": ${reason}`);
    this.name = "PathValidationError";
  }
}

export class ResourceLimitError extends Error {
  constructor(resource: string, limit: string) {
    super(`Resource limit exceeded: ${resource} (limit: ${limit})`);
    this.name = "ResourceLimitError";
  }
}
