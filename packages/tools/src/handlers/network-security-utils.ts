/**
 * Network security utilities — SSRF protection and domain policy enforcement
 * Matching OpenClaw's Go patterns: CheckSSRF, domain allowlist/blocklist
 * Shared by web_fetch, web_search, and browser tool handlers
 */

import { isIPv4 } from "node:net";

// --- SSRF Protection ---

/** Private/internal IP ranges that should never be fetched */
const PRIVATE_RANGES: Array<{ prefix: string; mask: number }> = [
  { prefix: "10.", mask: 8 },
  { prefix: "172.16.", mask: 12 },
  { prefix: "192.168.", mask: 16 },
  { prefix: "127.", mask: 8 },
  { prefix: "169.254.", mask: 16 },
  { prefix: "0.", mask: 8 },
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
]);

/** Check if an IP address is in a private/internal range */
function isPrivateIP(ip: string): boolean {
  if (!isIPv4(ip)) return false;
  for (const range of PRIVATE_RANGES) {
    if (ip.startsWith(range.prefix)) return true;
  }
  return false;
}

/** Check URL for SSRF vulnerabilities — rejects private IPs, internal hosts, non-http schemes */
export function checkSSRF(url: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: "Invalid URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { safe: false, reason: `Blocked protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: `Blocked hostname: ${hostname}` };
  }

  if (isPrivateIP(hostname)) {
    return { safe: false, reason: `Private IP address: ${hostname}` };
  }

  // Block IPv6 loopback
  if (hostname === "::1" || hostname === "[::1]") {
    return { safe: false, reason: "IPv6 loopback blocked" };
  }

  return { safe: true };
}

// --- Domain Policy ---

export interface DomainPolicy {
  /** Allowed domain patterns (supports wildcard: "*.example.com"). Empty = allow all. */
  allowedDomains?: string[];
  /** Blocked domain patterns (supports wildcard: "*.example.com"). Checked after allowed. */
  blockedDomains?: string[];
}

/** Match a hostname against a pattern (supports leading wildcard *.example.com) */
function matchDomainPattern(hostname: string, pattern: string): boolean {
  const p = pattern.toLowerCase();
  const h = hostname.toLowerCase();
  if (p.startsWith("*.")) {
    const suffix = p.slice(1); // ".example.com"
    return h.endsWith(suffix) || h === p.slice(2);
  }
  return h === p;
}

/** Check if a hostname is allowed by the domain policy */
export function checkDomainPolicy(
  hostname: string,
  policy?: DomainPolicy,
): { allowed: boolean; reason?: string } {
  if (!policy) return { allowed: true };

  const h = hostname.toLowerCase();

  // If allowedDomains is set, hostname must match at least one
  if (policy.allowedDomains && policy.allowedDomains.length > 0) {
    const isAllowed = policy.allowedDomains.some((p) => matchDomainPattern(h, p));
    if (!isAllowed) {
      return { allowed: false, reason: `Domain not in allowlist: ${h}` };
    }
  }

  // Check blocklist (even if allowlist passed — blocklist takes priority)
  if (policy.blockedDomains && policy.blockedDomains.length > 0) {
    const isBlocked = policy.blockedDomains.some((p) => matchDomainPattern(h, p));
    if (isBlocked) {
      return { allowed: false, reason: `Domain blocked: ${h}` };
    }
  }

  return { allowed: true };
}
