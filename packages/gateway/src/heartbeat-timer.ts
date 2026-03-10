/**
 * Heartbeat timer — periodic agent turn at configured interval
 * See: docs/disclaw/06-scheduling-cron.md § Heartbeat
 */

export type HeartbeatHandler = () => void | Promise<void>;

/** Parse duration string (e.g., "30m", "1h", "60s") to ms */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit]!;
}

export class HeartbeatTimer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private handler: HeartbeatHandler | null = null;

  constructor(private intervalMs: number) {}

  /** Register the heartbeat handler */
  onHeartbeat(handler: HeartbeatHandler): void {
    this.handler = handler;
  }

  /** Start the heartbeat timer */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        await this.handler?.();
      } catch (err) {
        console.error("[heartbeat] Error:", err);
      }
    }, this.intervalMs);
  }

  /** Stop the heartbeat timer */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Update the interval (restarts timer) */
  updateInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }
}
