/**
 * Container security settings for Docker sandbox
 * See: docs/disclaw/08-security-sandbox.md § Container Configuration
 */

import type { SandboxConfig } from "@disclaw/types";

export interface ContainerOptions {
  image: string;
  networkMode: string;
  memoryLimit: number;
  cpuPeriod: number;
  cpuQuota: number;
  timeout: number;
  readonlyRootfs: boolean;
  capDrop: string[];
  securityOpt: string[];
  user: string;
  workspace: string;
  denyPaths: string[];
}

/** Default container configuration */
const DEFAULTS: ContainerOptions = {
  image: "node:18-alpine",
  networkMode: "none",
  memoryLimit: 512 * 1024 * 1024, // 512MB
  cpuPeriod: 100000,
  cpuQuota: 50000, // 0.5 cores
  timeout: 30000,
  readonlyRootfs: true,
  capDrop: ["ALL"],
  securityOpt: ["no-new-privileges:true"],
  user: "1000:1000",
  workspace: "~/.disclaw/workspace",
  denyPaths: ["/etc/passwd", "/root/.ssh", "/root/.aws"],
};

/** Parse memory limit string (e.g., "512m") to bytes */
function parseMemoryLimit(limit: string): number {
  const match = limit.match(/^(\d+)(m|g)$/i);
  if (!match) return DEFAULTS.memoryLimit;
  const value = parseInt(match[1]!, 10);
  return match[2]!.toLowerCase() === "g" ? value * 1024 * 1024 * 1024 : value * 1024 * 1024;
}

/** Build container options from config, merging with defaults */
export function buildContainerOptions(config?: SandboxConfig): ContainerOptions {
  if (!config) return DEFAULTS;

  const docker = config.docker;
  return {
    image: docker?.image ?? DEFAULTS.image,
    networkMode: docker?.networkMode ?? DEFAULTS.networkMode,
    memoryLimit: docker?.memoryLimit
      ? parseMemoryLimit(docker.memoryLimit)
      : DEFAULTS.memoryLimit,
    cpuPeriod: DEFAULTS.cpuPeriod,
    cpuQuota: docker?.cpuLimit
      ? Math.floor(docker.cpuLimit * DEFAULTS.cpuPeriod)
      : DEFAULTS.cpuQuota,
    timeout: docker?.timeout ?? DEFAULTS.timeout,
    readonlyRootfs: DEFAULTS.readonlyRootfs,
    capDrop: DEFAULTS.capDrop,
    securityOpt: DEFAULTS.securityOpt,
    user: DEFAULTS.user,
    workspace: config.workspace ?? DEFAULTS.workspace,
    denyPaths: config.denyPaths ?? DEFAULTS.denyPaths,
  };
}
