/**
 * HTML content extraction utilities — Readability + markdown conversion
 * Shared by web_fetch and browser tool handlers
 */

export type ExtractMode = "markdown" | "text";

/** Extract readable content from HTML using Mozilla Readability */
export async function extractReadableContent(
  html: string,
  url: string,
  mode: ExtractMode,
): Promise<{ title: string; text: string } | null> {
  const { Readability } = await import("@mozilla/readability");
  const { parseHTML } = await import("linkedom");

  const { document } = parseHTML(html);

  // Set baseURI for relative URL resolution
  const base = document.createElement("base");
  base.setAttribute("href", url);
  document.head.appendChild(base);

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article || !article.textContent?.trim()) {
    return null;
  }

  if (mode === "text") {
    return { title: article.title || "", text: article.textContent.trim() };
  }

  return {
    title: article.title || "",
    text: htmlToSimpleMarkdown(article.content || article.textContent),
  };
}

/** Convert cleaned HTML to simple markdown-like text */
export function htmlToSimpleMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, "\n#### $1\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(p|div|br|blockquote|hr|ul|ol)[^>]*>/gi, "\n")
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n```\n$1\n```\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
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

/** Truncate text to maxChars, appending indicator if truncated */
export function truncateText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: text.slice(0, maxChars) + "\n\n[Truncated — exceeded " + maxChars + " chars]",
    truncated: true,
  };
}
