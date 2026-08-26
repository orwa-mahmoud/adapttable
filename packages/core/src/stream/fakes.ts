/**
 * An in-memory socket, so the connector's behaviour can be driven exactly —
 * a drop, a bad frame, a server that closes for good — without a network.
 */
import type { StreamSocket, StreamSocketEvent } from "./connect";

type Listener = (event: StreamSocketEvent) => void;

/** A WebSocket / EventSource stand-in that a test drives by hand. */
export class FakeSocket implements StreamSocket {
  readyState = 0;
  readonly url: string;
  readonly protocols?: string | string[];
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
  }

  addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
  }

  /** The server accepted the connection. */
  open(): void {
    this.readyState = 1;
    this.emit("open", {});
  }

  /** A text frame arrived. */
  push(data: string, type = "message"): void {
    this.emit(type, { data });
  }

  /** An error with the socket still open. */
  fail(): void {
    this.emit("error", {});
  }

  /** The connection dropped. */
  drop(): void {
    this.readyState = 3;
    this.emit("close", {});
  }

  /** EventSource retrying on its own. */
  sseConnecting(): void {
    this.readyState = 0;
    this.emit("error", {});
  }

  /** EventSource gave up. */
  sseClosed(): void {
    this.readyState = 2;
    this.emit("error", {});
  }

  private emit(type: string, event: StreamSocketEvent): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }
}
