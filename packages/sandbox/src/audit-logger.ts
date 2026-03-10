/**
 * Security event audit logging
 * See: docs/disclaw/08-security-sandbox.md § Audit Logging
 */

export type AuditEventType =
  | "approval_requested"
  | "approval_granted"
  | "approval_denied"
  | "sandbox_error"
  | "path_validation_failed"
  | "resource_limit_exceeded"
  | "sandbox_unavailable";

export interface AuditEvent {
  timestamp: string;
  type: AuditEventType;
  agentId: string;
  userId?: string;
  details: Record<string, unknown>;
}

/** Log a security audit event */
export function logAuditEvent(event: Omit<AuditEvent, "timestamp">): void {
  const full: AuditEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  // Log to console in structured format
  console.log(`[audit] ${JSON.stringify(full)}`);
}
