/**
 * Tool handler for the "web_search" tool — multi-provider web search
 * Providers: Brave Search (primary), DuckDuckGo (fallback)
 * Matching OpenClaw's Go web-search approach: provider fallback, cache, freshness filters
 * See: docs/disclaw/05-tools-skills-system.md § web_search
 */

import type { ToolCall } from "@disclaw/types";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

// --- Constants matching OpenClaw ---

const DEFAULT_SEARCH_COUNT = 5;
const MAX_SEARCH_COUNT = 10;
const SEARCH_TIMEOUT_MS = 30_000;
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DDG_SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Default cache TTL: 15 minutes */
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

// --- Freshness validation (matching Go/TS) ---

const FRESHNESS_SHORTCUTS = new Set(["pd", "pw", "pm", "py"]);
const FRESHNESS_RANGE_RE = /^(\d{4}-\d{2}-\d{2})to(\d{4}-\d{2}-\d{2})$/;

function normalizeFreshness(value?: string): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  if (FRESHNESS_SHORTCUTS.has(v)) return v;
  const m = FRESHNESS_RANGE_RE.exec(v);
  if (m?.[1] && m[2]) {
    const start = new Date(m[1]);
    const end = new Date(m[2]);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) return v;
  }
  return "";
}

// --- Types ---

interface SearchParams {
  query: string;
  count: number;
  country?: string;
  searchLang?: string;
  uiLang?: string;
  freshness?: string;
}

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

/** Abstraction for pluggable search backends */
interface SearchProvider {
  name: string;
  search(params: SearchParams, signal: AbortSignal): Promise<SearchResult[]>;
}

// --- Cache ---

interface CacheEntry {
  value: string;
  expiresAt: number;
}

class SearchCache {
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
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value as string;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

// --- Brave Search Provider ---

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      age?: string;
    }>;
  };
}

function createBraveProvider(apiKey: string): SearchProvider {
  return {
    name: "brave",
    async search(params: SearchParams, signal: AbortSignal): Promise<SearchResult[]> {
      const urlParams = new URLSearchParams({
        q: params.query,
        count: String(params.count),
      });
      if (params.country) urlParams.set("country", params.country);
      if (params.searchLang) urlParams.set("search_lang", params.searchLang);
      if (params.uiLang) urlParams.set("ui_lang", params.uiLang);
      if (params.freshness) urlParams.set("freshness", params.freshness);

      const response = await fetch(`${BRAVE_SEARCH_ENDPOINT}?${urlParams}`, {
        signal,
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Invalid or expired Brave Search API key");
        }
        if (response.status === 429) {
          throw new Error("Brave Search rate limit exceeded");
        }
        throw new Error(`Brave Search HTTP ${response.status}`);
      }

      const data = (await response.json()) as BraveSearchResponse;
      return (data.web?.results ?? [])
        .filter((r) => r.title && r.url)
        .map((r) => ({
          title: r.title!,
          url: r.url!,
          description: r.description ?? "",
        }));
    },
  };
}

// --- DuckDuckGo Provider (fallback) ---

function createDuckDuckGoProvider(): SearchProvider {
  return {
    name: "duckduckgo",
    async search(params: SearchParams, signal: AbortSignal): Promise<SearchResult[]> {
      const response = await fetch(
        `${DDG_SEARCH_ENDPOINT}?q=${encodeURIComponent(params.query)}`,
        {
          signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html",
            "Accept-Language": "en-US,en;q=0.9",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`DuckDuckGo HTTP ${response.status}`);
      }

      const html = await response.text();

      // Check for CAPTCHA block
      if (html.includes("anomaly-modal") || html.includes("bots use DuckDuckGo")) {
        throw new Error("DuckDuckGo CAPTCHA block — try Brave Search instead");
      }

      return parseDuckDuckGoResults(html, params.count);
    },
  };
}

/** Parse DuckDuckGo HTML lite results */
function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  const blocks = html.split(/class="result__body"/);

  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i]!;
    const linkMatch = block.match(
      /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/,
    );
    if (!linkMatch) continue;

    const rawUrl = linkMatch[1] ?? "";
    const title = (linkMatch[2] ?? "").replace(/<[^>]+>/g, "").trim();

    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/,
    );
    const description = snippetMatch
      ? (snippetMatch[1] ?? "").replace(/<[^>]+>/g, "").trim()
      : "";

    // Extract actual URL from DuckDuckGo redirect wrapper
    let url = rawUrl;
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch?.[1]) url = decodeURIComponent(uddgMatch[1]);

    if (title && url) results.push({ title, url, description });
  }

  return results;
}

// --- Formatting ---

function formatResults(
  query: string,
  results: SearchResult[],
  providerName: string,
): string {
  if (results.length === 0) {
    return `No results found for: "${query}"`;
  }

  const lines = [`Search results for: "${query}" (via ${providerName})\n`];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    lines.push(`${i + 1}. ${r.title}`);
    lines.push(`   ${r.url}`);
    if (r.description) lines.push(`   ${r.description}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}

function buildCacheKey(params: SearchParams): string {
  return [
    params.query,
    String(params.count),
    params.country ?? "default",
    params.searchLang ?? "default",
    params.uiLang ?? "default",
    params.freshness ?? "default",
  ].join(":");
}

// --- Factory ---

export interface WebSearchToolDeps {
  /** Brave API key (overrides BRAVE_API_KEY env) */
  braveApiKey?: string;
  /** Enable DuckDuckGo fallback (default: true) */
  ddgEnabled?: boolean;
  /** Cache TTL in ms (default: 15 min) */
  cacheTtlMs?: number;
}

/** Create web_search handler with multi-provider fallback and caching */
export function createWebSearchToolHandler(deps?: WebSearchToolDeps): ToolHandler {
  // Build provider list: Brave (primary) > DuckDuckGo (fallback)
  const providers: SearchProvider[] = [];

  const braveKey = deps?.braveApiKey || process.env["BRAVE_API_KEY"];
  if (braveKey) {
    providers.push(createBraveProvider(braveKey));
  }
  if (deps?.ddgEnabled !== false) {
    providers.push(createDuckDuckGoProvider());
  }

  const cache = new SearchCache(
    MAX_CACHE_ENTRIES,
    deps?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
  );

  return async (toolCall: ToolCall): Promise<string> => {
    const input = toolCall.input as Record<string, unknown>;
    const query = input.query as string | undefined;
    const count = input.count as number | undefined;
    const country = input.country as string | undefined;
    const searchLang = input.search_lang as string | undefined;
    const uiLang = input.ui_lang as string | undefined;
    const freshness = input.freshness as string | undefined;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return "Error: 'query' is required and cannot be empty.";
    }

    if (providers.length === 0) {
      return "Error: No search providers configured. Set BRAVE_API_KEY for Brave Search.";
    }

    const params: SearchParams = {
      query: query.trim(),
      count: Math.min(Math.max(count ?? DEFAULT_SEARCH_COUNT, 1), MAX_SEARCH_COUNT),
      country: country?.trim() || undefined,
      searchLang: searchLang?.trim() || undefined,
      uiLang: uiLang?.trim() || undefined,
      freshness: normalizeFreshness(freshness) || undefined,
    };

    // Check cache
    const cacheKey = buildCacheKey(params);
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Try providers in order (first success wins)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    let lastError: Error | undefined;

    try {
      for (const provider of providers) {
        try {
          const results = await provider.search(params, controller.signal);
          const formatted = formatResults(params.query, results, provider.name);
          cache.set(cacheKey, formatted);
          return formatted;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(
            `[web_search] Provider ${provider.name} failed: ${lastError.message}`,
          );
          continue;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return `Error: All search providers failed. Last error: ${lastError?.message ?? "unknown"}`;
  };
}
