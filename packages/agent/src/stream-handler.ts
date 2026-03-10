/**
 * Stream LLM response tokens to Discord
 * See: docs/disclaw/03-agent-runtime.md § Reply Streaming
 *
 * Buffer strategy: send every 500 chars or 2s timeout
 */

export type SendHandler = (content: string) => Promise<void>;

export interface StreamHandlerOptions {
  /** Buffer flush threshold in chars (default: 500) */
  bufferSize?: number;
  /** Buffer flush timeout in ms (default: 2000) */
  flushTimeoutMs?: number;
  /** Handler to send buffered content to Discord */
  onSend: SendHandler;
}

export class StreamHandler {
  private buffer = "";
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly bufferSize: number;
  private readonly flushTimeoutMs: number;
  private readonly onSend: SendHandler;

  constructor(options: StreamHandlerOptions) {
    this.bufferSize = options.bufferSize ?? 500;
    this.flushTimeoutMs = options.flushTimeoutMs ?? 2000;
    this.onSend = options.onSend;
  }

  /** Add tokens to the buffer */
  async push(text: string): Promise<void> {
    this.buffer += text;

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    } else {
      this.startFlushTimer();
    }
  }

  /** Flush the buffer immediately */
  async flush(): Promise<void> {
    this.clearFlushTimer();
    if (this.buffer.length > 0) {
      const content = this.buffer;
      this.buffer = "";
      await this.onSend(content);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch(console.error);
    }, this.flushTimeoutMs);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
