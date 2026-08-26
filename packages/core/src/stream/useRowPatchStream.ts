/**
 * A live stream of patches, bound to the rows a host already owns.
 *
 * The table never holds the data, and a socket does not change that: this
 * hook parses frames into patches, applies them with `applyRowPatches`, and
 * hands the result back through the host's own setter. Everything the table
 * does about it — re-filtering, re-sorting, aggregates — is the ordinary
 * incremental path, because a patched array is a patched array whether it
 * arrived from a websocket or a button.
 *
 * ```tsx
 * const [rows, setRows] = useState(initial);
 * const stream = useRowPatchStream({
 *   websocket: "wss://api/rows",
 *   getRowId: (row) => row.id,
 *   onPatch: setRows,
 * });
 * ```
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { applyRowPatches, type RowPatch } from "../rows/patch";
import {
  openRowPatchStream,
  type RowPatchStreamReconnect,
  type StreamSocket,
} from "./connect";
import { parseRowPatchFrame } from "./parse";
import type { RowPatchStreamStatus } from "./status";

/** What {@link useRowPatchStream} needs. */
export interface UseRowPatchStreamOptions<TRow> {
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
  /** Row identity — the table's own `rowKey`. */
  getRowId: (row: TRow) => string;
  /**
   * Apply the patched rows. Receives an updater, so it drops straight into
   * a `useState` setter and never races a concurrent update.
   */
  onPatch: (update: (rows: readonly TRow[]) => readonly TRow[]) => void;
  /**
   * Turn a frame into patches. Defaults to {@link parseRowPatchFrame}, which
   * reads the table's own patch shape as JSON. Supply this when the server
   * speaks something else.
   */
  parse?: (frame: string) => readonly RowPatch<TRow>[];
  /** Open the connection. Defaults to true; `false` keeps it idle. */
  enabled?: boolean;
  /** Called after each batch is applied, with what arrived. */
  onPatches?: (patches: readonly RowPatch<TRow>[]) => void;
  /**
   * Build the WebSocket yourself — an authenticated one, a wrapper, a fake in
   * a test. Omit it and the platform's own `WebSocket` is used.
   */
  createWebSocket?: (
    url: string,
    protocols?: string | string[]
  ) => StreamSocket | undefined;
  /** Build the EventSource yourself. Same reasons as `createWebSocket`. */
  createEventSource?: (url: string) => StreamSocket | undefined;
}

/** What the hook reports back. */
export interface RowPatchStreamState {
  /** What the connection is doing. */
  status: RowPatchStreamStatus;
  /** Why it gave up, when it did. */
  error: Error | null;
  /** Close it for good. */
  close: () => void;
}

/**
 * Bind a patch stream to a host's rows.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseRowPatchStreamOptions}.
 * @returns The connection state; inert while `enabled` is false.
 */
export function useRowPatchStream<TRow>(
  options: UseRowPatchStreamOptions<TRow>
): RowPatchStreamState {
  const [status, setStatus] = useState<RowPatchStreamStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  // Everything the frame handler reads lives behind a ref: a host writes
  // `onPatch` and `parse` inline, and re-opening the socket on every render
  // would drop frames for a living.
  const latest = useRef(options);
  latest.current = options;
  const handle = useRef<{ close: () => void } | null>(null);

  const {
    websocket,
    eventSource,
    event,
    protocols,
    enabled = true,
    reconnect,
  } = options;
  const hasWebSocketFactory = options.createWebSocket !== undefined;
  const hasEventSourceFactory = options.createEventSource !== undefined;
  const delayMs = reconnect?.delayMs;
  const maxAttempts = reconnect?.maxAttempts;

  useEffect(() => {
    if (!enabled || (!websocket && !eventSource)) {
      setStatus("idle");
      setError(null);
      return;
    }
    const stream = openRowPatchStream({
      websocket,
      eventSource,
      event,
      protocols,
      reconnect: { delayMs, maxAttempts },
      // Only forwarded when the host actually supplied one — passing an
      // always-present wrapper would hide the platform's own constructor,
      // which is what an ordinary app relies on.
      createWebSocket: hasWebSocketFactory
        ? (url, subprotocols) =>
            latest.current.createWebSocket?.(url, subprotocols)
        : undefined,
      createEventSource: hasEventSourceFactory
        ? (url) => latest.current.createEventSource?.(url)
        : undefined,
      onStatus: (next, reason) => {
        setStatus(next);
        setError(reason);
      },
      onMessage: (frame) => {
        const current = latest.current;
        const parse = current.parse ?? parseRowPatchFrame<TRow>;
        const patches = parse(frame);
        if (patches.length === 0) return;
        current.onPatch((rows) =>
          applyRowPatches(rows, patches, current.getRowId)
        );
        current.onPatches?.(patches);
      },
    });
    handle.current = stream;
    return () => {
      stream.close();
      handle.current = null;
    };
  }, [
    enabled,
    websocket,
    eventSource,
    event,
    protocols,
    delayMs,
    maxAttempts,
    hasWebSocketFactory,
    hasEventSourceFactory,
  ]);

  const close = useCallback(() => {
    handle.current?.close();
  }, []);

  return { status, error, close };
}
