import { describe, it, expect } from "vitest";
import { validatePath } from "../path-validator.js";

describe("validatePath", () => {
  const workspace = "/home/user/.disclaw/workspace";
  const denyPaths = ["/etc", "/home/user/.ssh"];

  it("accepts a valid relative path within workspace", () => {
    const result = validatePath("notes/todo.md", workspace, denyPaths);
    expect(result.valid).toBe(true);
  });

  it("accepts the workspace root itself", () => {
    const result = validatePath(".", workspace, denyPaths);
    expect(result.valid).toBe(true);
  });

  it("rejects path traversal with ../", () => {
    const result = validatePath("../../../etc/passwd", workspace, denyPaths);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("escapes workspace");
  });

  it("rejects path traversal disguised in middle of path", () => {
    const result = validatePath("notes/../../.ssh/id_rsa", workspace, denyPaths);
    expect(result.valid).toBe(false);
  });

  it("rejects absolute paths in deny list", () => {
    const result = validatePath("/etc/passwd", "/", denyPaths);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("deny list");
  });

  it("accepts paths not in deny list", () => {
    const result = validatePath("docs/readme.md", workspace, denyPaths);
    expect(result.valid).toBe(true);
  });
});
