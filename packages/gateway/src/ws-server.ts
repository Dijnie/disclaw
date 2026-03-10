/**
 * Optional WebSocket RPC server for external clients
 * See: docs/disclaw/02-gateway.md
 */

import { WebSocketServer, type WebSocket } from "ws";

export interface WsServerOptions {
  port: number;
  host: string;
}

export type WsMessageHandler = (
  data: unknown,
  ws: WebSocket,
) => void | Promise<void>;

export class WsServer {
  private wss: WebSocketServer | null = null;
  private handler: WsMessageHandler | null = null;

  constructor(private readonly options: WsServerOptions) {}

  /** Register a message handler */
  onMessage(handler: WsMessageHandler): void {
    this.handler = handler;
  }

  /** Start the WebSocket server */
  start(): void {
    this.wss = new WebSocketServer({
      port: this.options.port,
      host: this.options.host,
    });

    this.wss.on("connection", (ws: WebSocket) => {
      ws.on("message", async (raw: Buffer) => {
        try {
          const data = JSON.parse(raw.toString()) as unknown;
          await this.handler?.(data, ws);
        } catch (err) {
          ws.send(JSON.stringify({ error: "Invalid message format" }));
        }
      });
    });
  }

  /** Stop the WebSocket server */
  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  /** Broadcast a message to all connected clients */
  broadcast(data: unknown): void {
    if (!this.wss) return;
    const message = JSON.stringify(data);
    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }
}
