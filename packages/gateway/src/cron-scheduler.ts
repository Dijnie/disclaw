/**
 * Cron job scheduler — persists jobs, 1s tick, retry on failure
 * See: docs/disclaw/06-scheduling-cron.md
 *
 * Schedule types: at (one-time), every (interval), cron (cron expression)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseDuration } from "./heartbeat-timer.js";

export type ScheduleType = "at" | "every" | "cron";

export interface CronJob {
  id: string;
  type: ScheduleType;
  /** ISO date for "at", duration string for "every", cron expression for "cron" */
  schedule: string;
  /** Callback identifier or action name */
  action: string;
  /** Number of retries on failure */
  retryCount: number;
  maxRetries: number;
  lastRunAt?: string;
  nextRunAt: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
}

export type CronHandler = (job: CronJob) => void | Promise<void>;

export class CronScheduler {
  private jobs = new Map<string, CronJob>();
  private handler: CronHandler | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly storePath: string) {}

  /** Register the job execution handler */
  onJob(handler: CronHandler): void {
    this.handler = handler;
  }

  /** Restore jobs from disk */
  restore(): void {
    if (!existsSync(this.storePath)) return;
    try {
      const raw = readFileSync(this.storePath, "utf-8");
      const data = JSON.parse(raw) as CronJob[];
      for (const job of data) {
        this.jobs.set(job.id, job);
      }
    } catch {
      this.jobs.clear();
    }
  }

  /** Persist jobs to disk */
  persist(): void {
    mkdirSync(dirname(this.storePath), { recursive: true });
    const data = JSON.stringify([...this.jobs.values()], null, 2);
    writeFileSync(this.storePath, data);
  }

  /** Add a scheduled job */
  addJob(job: Omit<CronJob, "status" | "createdAt" | "retryCount">): void {
    const fullJob: CronJob = {
      ...job,
      retryCount: 0,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(job.id, fullJob);
    this.persist();
  }

  /** Remove a job */
  removeJob(id: string): void {
    this.jobs.delete(id);
    this.persist();
  }

  /** Start the 1-second tick loop */
  start(): void {
    this.tickTimer = setInterval(() => this.tick(), 1000);
  }

  /** Stop the tick loop */
  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /** Check for due jobs and execute them */
  private async tick(): Promise<void> {
    const now = new Date();
    for (const [id, job] of this.jobs) {
      if (job.status === "running" || job.status === "completed") continue;

      const nextRun = new Date(job.nextRunAt);
      if (now < nextRun) continue;

      // Job is due — execute it
      job.status = "running";
      job.lastRunAt = now.toISOString();

      try {
        await this.handler?.(job);
        job.status = job.type === "at" ? "completed" : "pending";

        // Schedule next run for "every" jobs
        if (job.type === "every") {
          const intervalMs = parseDuration(job.schedule);
          job.nextRunAt = new Date(now.getTime() + intervalMs).toISOString();
        }

        // Auto-delete completed "at" jobs
        if (job.status === "completed") {
          this.jobs.delete(id);
        }

        job.retryCount = 0;
      } catch (err) {
        job.retryCount++;
        if (job.retryCount >= job.maxRetries) {
          job.status = "failed";
          console.error(`[cron] Job ${id} failed after ${job.maxRetries} retries:`, err);
        } else {
          job.status = "pending";
          // Retry in 5 seconds
          job.nextRunAt = new Date(now.getTime() + 5000).toISOString();
        }
      }
    }
    this.persist();
  }

  /** Get all jobs */
  getJobs(): CronJob[] {
    return [...this.jobs.values()];
  }
}
