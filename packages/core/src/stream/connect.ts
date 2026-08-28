/**
 * A WebSocket or EventSource, reduced to "here is a text frame".
 *
 * Deliberately thin: it opens one socket, forwards frames, reports what the
 * connection is doing, and reopens a dropped WebSocket. It knows nothing
 * about patches or tables, which is what makes it testable without either.
 *
 * EventSource reconnects by itself, so a retry here would fight it — an
 * `error` while it is still CONNECTING is reported as reconnecting and left
 * alone. A WebSocket has no such behaviour, so this reopens it.
 */
import type { RowPatchStreamStatus } from "./status";

/**
 * The slice of WebSocket / EventSource this needs. Anything else can stand in.
 *
 * @public
 */
export interface StreamSocket {
  addEventListener(
    type: string,
    listener: (event: StreamSocketEvent) => void
  ): void;
  removeEventListener(
    type: string,
    listener: (event: StreamSocketEvent) => void
  ): void;
  close(): void;
  readonly readyState: number;
}

/**
 * An `open` / `message` / `error` / `close` payload.
 *
 * @public
 */
export interface StreamSocketEvent {
  data?: unknown;
}

/**
 * How long to wait, and how many times, before giving up.
 *
 * @public
 */
export interface RowPatchStreamReconnect {
  /** Delay before the next open. Defaults to 1000 ms. */
  delayMs?: number;
  /** Stop after this many retries. Defaults to no cap. */
  maxAttempts?: number;
}

/**
 * What {@link openRowPatchStream} needs.
 *
 * @public
 */
export interface OpenRowPatchStreamOptions {
  /** WebSocket url. Takes precedence over `eventSource`. */
  websocket?: string;
  /** EventSource url. */
  eventSource?: string;
  /** Named SSE event to listen for. Defaults to `message`. */
  event?: string;
  /** WebSocket subprotocols. */
  protocols?: string | string[];
  /** Retry policy for a dropped WebSocket. */
  reconnect?: RowPatchStreamReconnect;
  /** Called with every text frame. */
  onMessage: (frame: string) => void;
  /** Called whenever the status changes, with the reason on failure. */
  onStatus: (status: RowPatchStreamStatus, error: Error | null) => void;
  /** Test seam: build the WebSocket. */
  createWebSocket?: (
    url: string,
    protocols?: string | string[]
  ) => StreamSocket | undefined;
  /** Test seam: build the EventSource. */
  createEventSource?: (url: string) => StreamSocket | undefined;
}

/**
 * A live connection, and the one thing a host does to it.
 *
 * @public
 */
export interface RowPatchStreamHandle {
  /** The current status. */
  readonly status: RowPatchStreamStatus;
  /** Close for good. Idempotent; nothing reopens afterwards. */
  close: () => void;
}

const ES_CONNECTING = 0;
const ES_CLOSED = 2;

/** Which transport to open, and where. */
function target(
  options: OpenRowPatchStreamOptions
): { kind: "websocket" | "sse"; url: string } | undefined {
  if (options.websocket) return { kind: "websocket", url: options.websocket };
  if (options.eventSource) return { kind: "sse", url: options.eventSource };
  return undefined;
}

function makeWebSocket(
  url: string,
  options: OpenRowPatchStreamOptions
): StreamSocket | undefined {
  if (options.createWebSocket) {
    return options.createWebSocket(url, options.protocols);
  }
  const Ctor = globalThis.WebSocket;
  return Ctor ? new Ctor(url, options.protocols) : undefined;
}

function makeEventSource(
  url: string,
  options: OpenRowPatchStreamOptions
): StreamSocket | undefined {
  if (options.createEventSource) return options.createEventSource(url);
  const Ctor = globalThis.EventSource;
  return Ctor ? new Ctor(url) : undefined;
}

/**
 * Open a stream of text frames.
 *
 * With neither url set nothing is created and the status is `idle` — which
 * is what makes this safe to call unconditionally from a hook.
 *
 * @param options - See {@link OpenRowPatchStreamOptions}.
 * @returns The handle; call `close()` when the host is done.
 *
 * @public
 */
export function openRowPatchStream(
  options: OpenRowPatchStreamOptions
): RowPatchStreamHandle {
  let status: RowPatchStreamStatus = "idle";
  let socket: StreamSocket | undefined;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closedByHost = false;
  /** Detach whatever the last socket was listening with. */
  let detach: (() => void) | undefined;

  const delayMs = options.reconnect?.delayMs ?? 1000;
  const maxAttempts =
    options.reconnect?.maxAttempts ?? Number.POSITIVE_INFINITY;

  function setStatus(next: RowPatchStreamStatus, error: Error | null): void {
    status = next;
    options.onStatus(next, error);
  }

  /**
   * Drop the current socket before a retry or a host close.
   *
   * Detach first: a real WebSocket `close()` emits `close`, and leaving the
   * listeners on would schedule a second retry for the same drop.
   */
  function release(): void {
    detach?.();
    detach = undefined;
    const current = socket;
    socket = undefined;
    current?.close();
  }

  function retryOrFail(
    kind: "websocket" | "sse",
    url: string,
    error: Error
  ): void {
    release();
    if (attempts >= maxAttempts) {
      setStatus("error", error);
      return;
    }
    attempts += 1;
    setStatus("reconnecting", null);
    timer = setTimeout(() => {
      if (!closedByHost) open(kind, url);
    }, delayMs);
  }

  function listen(
    current: StreamSocket,
    kind: "websocket" | "sse",
    url: string
  ): void {
    const messageType =
      kind === "sse" ? (options.event ?? "message") : "message";
    const bound: [string, (event: StreamSocketEvent) => void][] = [];
    const on = (type: string, listener: (event: StreamSocketEvent) => void) => {
      bound.push([type, listener]);
      current.addEventListener(type, listener);
    };
    detach = () => {
      for (const [type, listener] of bound) {
        current.removeEventListener(type, listener);
      }
    };
    on("open", () => {
      attempts = 0;
      setStatus("open", null);
    });
    on(messageType, (event: StreamSocketEvent) => {
      if (typeof event.data === "string") options.onMessage(event.data);
    });
    on("error", () => {
      if (closedByHost || socket !== current) return;
      if (kind === "sse") {
        // EventSource is retrying on its own; say so and stay out of its way.
        if (current.readyState === ES_CONNECTING) {
          setStatus("reconnecting", null);
          return;
        }
        if (current.readyState === ES_CLOSED) {
          retryOrFail(kind, url, new Error("event source closed"));
        }
        return;
      }
      retryOrFail(kind, url, new Error("websocket error"));
    });
    if (kind === "websocket") {
      on("close", () => {
        // A close that follows a reopen belongs to the socket we replaced.
        if (closedByHost || socket !== current) return;
        retryOrFail(kind, url, new Error("websocket closed"));
      });
    }
  }

  function open(kind: "websocket" | "sse", url: string): void {
    release();
    setStatus("connecting", null);
    const created =
      kind === "sse"
        ? makeEventSource(url, options)
        : makeWebSocket(url, options);
    if (!created) {
      setStatus("error", new Error(`${kind} is not available here`));
      return;
    }
    socket = created;
    listen(created, kind, url);
  }

  const where = target(options);
  if (!where) {
    setStatus("idle", null);
  } else {
    open(where.kind, where.url);
  }

  return {
    get status() {
      return status;
    },
    close() {
      if (closedByHost) return;
      closedByHost = true;
      if (timer !== undefined) clearTimeout(timer);
      release();
      setStatus("closed", null);
    },
  };
}
