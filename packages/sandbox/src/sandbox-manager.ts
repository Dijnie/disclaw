/**
 * Docker-based execution sandbox with fail-closed policy
 * See: docs/disclaw/08-security-sandbox.md
 *
 * Lifecycle: check enabled → create container → copy workspace → exec → capture → cleanup
 */

import Docker from "dockerode";

import type { SandboxConfig } from "@disclaw/types";
import {
  buildContainerOptions,
  type ContainerOptions,
} from "./container-config.js";
import { validatePath } from "./path-validator.js";
import { logAuditEvent } from "./audit-logger.js";
import {
  SandboxUnavailableError,
  SandboxTimeoutError,
  PathValidationError,
} from "./sandbox-errors.js";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SandboxManager {
  private docker: Docker;
  private options: ContainerOptions;
  private readonly agentId: string;
  private enabled: boolean;

  constructor(agentId: string, config?: SandboxConfig) {
    this.agentId = agentId;
    this.enabled = config?.enabled ?? true;
    this.options = buildContainerOptions(config);
    this.docker = new Docker();
  }

  /** Check if Docker daemon is available */
  async isAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /** Validate a file path against workspace and deny list */
  validateFilePath(requestedPath: string): void {
    const result = validatePath(
      requestedPath,
      this.options.workspace,
      this.options.denyPaths,
    );
    if (!result.valid) {
      logAuditEvent({
        type: "path_validation_failed",
        agentId: this.agentId,
        details: { path: requestedPath, reason: result.reason },
      });
      throw new PathValidationError(requestedPath, result.reason!);
    }
  }

  /** Execute a command in a sandboxed Docker container */
  async execute(command: string): Promise<ExecutionResult> {
    // Fail-closed: if sandbox disabled or unavailable, reject
    if (!this.enabled) {
      logAuditEvent({
        type: "sandbox_unavailable",
        agentId: this.agentId,
        details: { reason: "Sandbox disabled in config" },
      });
      throw new SandboxUnavailableError("Sandbox is disabled in configuration");
    }

    const available = await this.isAvailable();
    if (!available) {
      logAuditEvent({
        type: "sandbox_unavailable",
        agentId: this.agentId,
        details: { reason: "Docker daemon not running" },
      });
      throw new SandboxUnavailableError(
        "Docker daemon is not running. Cannot execute safely.",
      );
    }

    // Create container
    const container = await this.docker.createContainer({
      Image: this.options.image,
      Cmd: ["sh", "-c", command],
      NetworkDisabled: true,
      HostConfig: {
        NetworkMode: this.options.networkMode,
        Memory: this.options.memoryLimit,
        MemorySwap: this.options.memoryLimit, // No swap
        CpuPeriod: this.options.cpuPeriod,
        CpuQuota: this.options.cpuQuota,
        ReadonlyRootfs: this.options.readonlyRootfs,
        CapDrop: this.options.capDrop,
        SecurityOpt: this.options.securityOpt,
      },
      User: this.options.user,
    });

    try {
      // Start container
      await container.start();

      // Wait for completion with timeout
      const waitPromise = container.wait();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new SandboxTimeoutError(this.options.timeout)),
          this.options.timeout,
        ),
      );

      let exitCode: number;
      try {
        const result = await Promise.race([waitPromise, timeoutPromise]);
        exitCode = (result as { StatusCode: number }).StatusCode;
      } catch (err) {
        if (err instanceof SandboxTimeoutError) {
          await container.kill().catch(() => {});
          logAuditEvent({
            type: "resource_limit_exceeded",
            agentId: this.agentId,
            details: { resource: "timeout", limit: `${this.options.timeout}ms` },
          });
          throw err;
        }
        throw err;
      }

      // Capture output
      const logs = await container.logs({
        stdout: true,
        stderr: true,
      });
      const output = logs.toString("utf-8");

      return { stdout: output, stderr: "", exitCode };
    } finally {
      // Cleanup: always remove the container
      await container.remove({ force: true }).catch(() => {});
    }
  }

  /** Update sandbox config (e.g., on hot-reload) */
  updateConfig(config: SandboxConfig): void {
    this.enabled = config.enabled;
    this.options = buildContainerOptions(config);
  }
}
