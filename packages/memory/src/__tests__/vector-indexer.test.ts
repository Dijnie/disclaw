import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { VectorIndexer } from "../vector-indexer.js";

describe("VectorIndexer", () => {
  const testDir = join(tmpdir(), "disclaw-test-indexer");
  const dbPath = join(testDir, "test.sqlite");
  const agentDir = join(testDir, "agent");
  let indexer: VectorIndexer;

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(agentDir, { recursive: true });
    indexer = new VectorIndexer(dbPath);
  });

  afterEach(() => {
    indexer.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  it("indexes a file and searches by keyword", () => {
    writeFileSync(join(agentDir, "MEMORY.md"), "# Notes\nThe quick brown fox jumped over the lazy dog");
    indexer.indexFile("agent1", agentDir, "MEMORY.md");

    const results = indexer.search("agent1", "quick fox");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.content).toContain("quick brown fox");
  });

  it("returns empty for no match", () => {
    writeFileSync(join(agentDir, "MEMORY.md"), "hello world");
    indexer.indexFile("agent1", agentDir, "MEMORY.md");

    const results = indexer.search("agent1", "zzzzzzzzz");
    expect(results).toEqual([]);
  });

  it("respects limit parameter", () => {
    writeFileSync(
      join(agentDir, "notes.md"),
      "## Section 1\nfoo bar\n## Section 2\nfoo baz\n## Section 3\nfoo qux",
    );
    indexer.indexFile("agent1", agentDir, "notes.md");

    const results = indexer.search("agent1", "foo", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("tracks dirty files", () => {
    expect(indexer.hasDirtyFiles()).toBe(false);
    indexer.markDirty(["a.md", "b.md"]);
    expect(indexer.hasDirtyFiles()).toBe(true);
    expect(indexer.getDirtyFiles()).toEqual(["a.md", "b.md"]);
  });

  it("clears dirty flag after indexing", () => {
    writeFileSync(join(agentDir, "test.md"), "content");
    indexer.markDirty(["test.md"]);
    indexer.indexFile("agent1", agentDir, "test.md");
    expect(indexer.getDirtyFiles()).not.toContain("test.md");
  });

  it("re-indexes file by removing old chunks first", () => {
    writeFileSync(join(agentDir, "doc.md"), "alpha bravo");
    indexer.indexFile("agent1", agentDir, "doc.md");
    let results = indexer.search("agent1", "alpha bravo");
    expect(results).toHaveLength(1);

    writeFileSync(join(agentDir, "doc.md"), "charlie delta");
    indexer.indexFile("agent1", agentDir, "doc.md");
    // Old content should be gone
    results = indexer.search("agent1", "alpha bravo");
    expect(results).toHaveLength(0);
    // New content should be found
    results = indexer.search("agent1", "charlie delta");
    expect(results).toHaveLength(1);
  });

  it("returns empty for empty query", () => {
    const results = indexer.search("agent1", "");
    expect(results).toEqual([]);
  });
});
