/**
 * Tool handler for the "browser" tool — fetch URL content or take screenshots
 * - get: fetch via native fetch, strip HTML to readable text
 * - screenshot: capture page via Puppeteer, save to workspace
 * See: docs/disclaw/05-tools-skills-system.md § browser
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ToolCall } from "@disclaw/types";

export type ToolHandler = (toolCall: ToolCall) => Promise<string>;

/** Max response body size to prevent memory issues (500KB) */
const MAX_BODY_SIZE = 500_000;

/** Request timeout in ms */
const FETCH_TIMEOUT_MS = 15_000;

/** Puppeteer page load timeout in ms */
const SCREENSHOT_TIMEOUT_MS = 20_000;

interface BrowserToolDeps {
  /** Directory to save screenshots (e.g., ~/.disclaw/workspace) */
  workspaceDir: string;
}

/** Strip HTML tags and collapse whitespace into readable text */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|hr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Fetch URL content as text */
async function fetchUrlContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "DisClaw/1.0 (Discord Bot Agent)",
      Accept: "text/html, application/json, text/plain",
    },
    redirect: "follow",
  });

  clearTimeout(timeout);

  if (!response.ok) {
    return `Error: HTTP ${response.status} ${response.statusText}`;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const truncated = body.length > MAX_BODY_SIZE
    ? body.slice(0, MAX_BODY_SIZE) + "\n\n[Truncated — content exceeded 500KB]"
    : body;

  if (contentType.includes("application/json")) return truncated;
  if (contentType.includes("text/html")) return htmlToText(truncated);
  return truncated;
}

/** Take a screenshot of a URL using Puppeteer, save to workspace */
async function takeScreenshot(url: string, screenshotDir: string): Promise<string> {
  // Dynamic import — avoids loading Puppeteer when only using "get" action
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: SCREENSHOT_TIMEOUT_MS,
    });

    const title = await page.title();
    const timestamp = Date.now();
    const slug = url
      .replace(/^https?:\/\//, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .slice(0, 80);
    const filename = `screenshot-${timestamp}-${slug}.png`;

    mkdirSync(screenshotDir, { recursive: true });
    const filepath = join(screenshotDir, filename);

    await page.screenshot({ path: filepath, fullPage: false });

    return [
      `Screenshot saved: ${filepath}`,
      `Page title: ${title}`,
      `URL: ${url}`,
      `Viewport: 1280x720`,
    ].join("\n");
  } finally {
    await browser.close();
  }
}

/** Create the browser tool handler bound to a workspace directory */
export function createBrowserToolHandler(deps: BrowserToolDeps): ToolHandler {
  const screenshotDir = join(deps.workspaceDir, "screenshots");

  return async (toolCall: ToolCall): Promise<string> => {
    const { url, action } = toolCall.input as {
      url: string;
      action?: "get" | "screenshot";
    };

    if (!url || typeof url !== "string") {
      return "Error: 'url' is required.";
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return `Error: Invalid URL: ${url}`;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return `Error: Only http/https URLs are supported, got ${parsedUrl.protocol}`;
    }

    try {
      if (action === "screenshot") {
        return await takeScreenshot(url, screenshotDir);
      }
      return await fetchUrlContent(url);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return `Error: Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`;
      }
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  };
}
