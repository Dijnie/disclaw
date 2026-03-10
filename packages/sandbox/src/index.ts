/**
 * @disclaw/sandbox - Docker sandbox, approval gates, path validation
 */

export { SandboxManager } from "./sandbox-manager.js";
export type { ExecutionResult } from "./sandbox-manager.js";
export { buildContainerOptions } from "./container-config.js";
export type { ContainerOptions } from "./container-config.js";
export { validatePath } from "./path-validator.js";
export { logAuditEvent } from "./audit-logger.js";
export type { AuditEvent, AuditEventType } from "./audit-logger.js";
export {
  SandboxUnavailableError,
  SandboxTimeoutError,
  PathValidationError,
  ResourceLimitError,
} from "./sandbox-errors.js";
