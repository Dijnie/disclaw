/**
 * Tool handler for the "web_fetch" tool — fetch URL and extract readable content
 * Matching OpenClaw's Go web-fetch approach: SSRF protection, domain policy,
 * redirect validation, caching, and Readability extraction
 * See: docs/disclaw/05-tools-skills-system.md § web_fetch
 */

import type { ToolCall } from "@disclaw/types";
import { checkSSRF, checkDomainPolicy, type DomainPolicy } from "./network-security-utils.js";
import {
  extractReadableContent,
  htmlToSimpleMarkdown,
  truncateText,
  type ExtractMode,
} from "./html-content-extractor.js";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

// --- Constants matching OpenClaw ---

const DEFAULT_MAX_CHARS = 50_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// --- Cache ---

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class FetchCache {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private maxEntries: number,
    private ttlMs: number,
  ) {}

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: string): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value as string;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

// --- Safe fetch with redirect validation ---

interface SafeFetchResult {
  response: Response;
  finalUrl: string;
  redirectCount: number;
}

async function safeFetch(
  url: string,
  signal: AbortSignal,
  policy?: DomainPolicy,
): Promise<SafeFetchResult> {
  let currentUrl = url;
  let redirectCount = 0;

  for (;;) {
    // SSRF check on every redirect hop
    const ssrf = checkSSRF(currentUrl);
    if (!ssrf.safe) throw new Error(`SSRF blocked: ${ssrf.reason}`);

    // Domain policy check on every redirect hop
    const parsed = new URL(currentUrl);
    const domainCheck = checkDomainPolicy(parsed.hostname, policy);
    if (!domainCheck.allowed) throw new Error(`Domain policy: ${domainCheck.reason}`);

    const response = await fetch(currentUrl, {
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/markdown, text/html;q=0.9, application/json;q=0.8, */*;q=0.1",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "manual",
    });

    // Handle redirects manually to validate each hop
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      redirectCount++;
      if (redirectCount > MAX_REDIRECTS) {
        throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
      }
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without Location header");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return { response, finalUrl: currentUrl, redirectCount };
  }
}

// --- Content extraction dispatch ---

async function extractContent(
  body: string,
  contentType: string,
  url: string,
  mode: ExtractMode,
): Promise<{ title: string; text: string; extractor: string }> {
  if (contentType.includes("text/markdown")) {
    const text = mode === "text" ? body.replace(/[#*`[\]()_~>-]/g, "") : body;
    return { title: "", text, extractor: "cf-markdown" };
  }

  if (contentType.includes("text/html")) {
    const readable = await extractReadableContent(body, url, mode);
    if (readable?.text) {
      return { title: readable.title, text: readable.text, extractor: "readability" };
    }
    return { title: "", text: htmlToSimpleMarkdown(body), extractor: "fallback" };
  }

  if (contentType.includes("application/json")) {
    try {
      return { title: "", text: JSON.stringify(JSON.parse(body), null, 2), extractor: "json" };
    } catch {
      return { title: "", text: body, extractor: "raw" };
    }
  }

  return { title: "", text: body, extractor: "raw" };
}

// --- Factory ---

export interface WebFetchToolDeps {
  /** Max characters to return (default: 50000) */
  maxChars?: number;
  /** Cache TTL in ms (default: 10 min) */
  cacheTtlMs?: number;
  /** Domain allowlist/blocklist policy */
  domainPolicy?: DomainPolicy;
}

/** Create web_fetch handler with SSRF protection, domain policy, caching */
export function createWebFetchToolHandler(deps?: WebFetchToolDeps): ToolHandler {
  const defaultMaxChars = deps?.maxChars ?? DEFAULT_MAX_CHARS;
  const cache = new FetchCache(MAX_CACHE_ENTRIES, deps?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
  const policy = deps?.domainPolicy;

  return async (toolCall: ToolCall): Promise<string> => {
    const input = toolCall.input as Record<string, unknown>;
    const url = input.url as string | undefined;
    const extractMode = input.extractMode as string | undefined;
    const maxChars = input.maxChars as number | undefined;

    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return "Error: 'url' is required and cannot be empty.";
    }

    // SSRF check on initial URL
    const ssrf = checkSSRF(url);
    if (!ssrf.safe) return `Error: ${ssrf.reason}`;

    // Domain policy check on initial URL
    try {
      const parsed = new URL(url);
      const domainCheck = checkDomainPolicy(parsed.hostname, policy);
      if (!domainCheck.allowed) return `Error: ${domainCheck.reason}`;
    } catch {
      return `Error: Invalid URL: ${url}`;
    }

    const mode: ExtractMode = extractMode === "text" ? "text" : "markdown";
    const charLimit = Math.min(Math.max(maxChars ?? defaultMaxChars, 100), defaultMaxChars);

    // Check cache
    const cacheKey = `${url}:${mode}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const { response, finalUrl, redirectCount } = await safeFetch(url, controller.signal, policy);

      if (!response.ok) {
        return `Error: HTTP ${response.status} ${response.statusText}`;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const body = await response.text();
      const rawText = body.length > MAX_RESPONSE_BYTES ? body.slice(0, MAX_RESPONSE_BYTES) : body;

      // Detect empty content (JS-rendered pages)
      if (!rawText.trim() || rawText.trim().length < 50) {
        return [
          `URL: ${finalUrl}`,
          "Content: Empty or minimal content detected.",
          "This page may require JavaScript rendering. Try the 'browser' tool instead.",
        ].join("\n");
      }

      const { title, text, extractor } = await extractContent(rawText, contentType, finalUrl, mode);
      const result = truncateText(text, charLimit);

      // Build structured output matching OpenClaw metadata format
      const lines: string[] = [];
      if (title) lines.push(`Title: ${title}`);
      lines.push(`URL: ${finalUrl}`);
      if (finalUrl !== url) lines.push(`Original URL: ${url}`);
      if (redirectCount > 0) lines.push(`Redirects: ${redirectCount}`);
      lines.push(`Extractor: ${extractor}`);
      lines.push(`Content-Length: ${text.length}`);
      if (result.truncated) lines.push(`Truncated: yes (limit: ${charLimit} chars)`);
      lines.push("---");
      lines.push(result.text);

      const output = lines.join("\n");
      cache.set(cacheKey, output);
      return output;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return `Error: Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`;
      }
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      clearTimeout(timeout);
    }
  };
}
