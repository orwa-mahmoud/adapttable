/**
 * A live feed of row patches — a WebSocket or a server-sent-event endpoint —
 * bound to rows the host already owns, over `@adapttable/core`'s stream.
 */
import {
  type MaybeSignal,
  type MaybeSignalOptional,
  readMaybe,
} from "@adapttable/angular";
import {
  applyRowPatches,
  openRowPatchStream,
  parseRowPatchFrame,
  type RowPatch,
  type RowPatchStreamReconnect,
  type RowPatchStreamStatus,
  type StreamSocket,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  effect,
  inject,
  Injector,
  type Signal,
  signal,
  untracked,
} from "@angular/core";

/**
 * Options for {@link injectRowPatchStream}.
 *
 * @public
 */
export interface RowPatchStreamOptions<TRow> {
  /** A WebSocket URL. The stream opens while it (or `eventSource`) is set. */
  readonly websocket?: MaybeSignalOptional<string>;
  /** A server-sent-events URL. */
  readonly eventSource?: MaybeSignalOptional<string>;
  /** The SSE event name to listen to. Defaults to messages. */
  readonly event?: string;
  /** WebSocket subprotocols. */
  readonly protocols?: string | string[];
  /** How a dropped connection comes back. */
  readonly reconnect?: RowPatchStreamReconnect;
  /** A row's stable id, to apply a patch to the right row. */
  readonly getRowId: (row: TRow) => string;
  /**
   * Called with an updater for each frame that carries patches — hand it
   * straight to a signal: `onPatch: (update) => rows.update(update)`.
   */
  readonly onPatch: (
    update: (rows: readonly TRow[]) => readonly TRow[]
  ) => void;
  /** Turn a frame into patches. Defaults to the JSON row-patch format. */
  readonly parse?: (frame: string) => readonly RowPatch<TRow>[];
  /** Whether the stream is open at all. Defaults to `true`. */
  readonly enabled?: MaybeSignal<boolean>;
  /** Told the patches each frame carried, after they are applied. */
  readonly onPatches?: (patches: readonly RowPatch<TRow>[]) => void;
  /** Build the WebSocket, for a test or a custom client. */
  readonly createWebSocket?: (
    url: string,
    protocols?: string | string[]
  ) => StreamSocket | undefined;
  /** Build the EventSource, for a test or a custom client. */
  readonly createEventSource?: (url: string) => StreamSocket | undefined;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * The stream's connection, read through signals.
 *
 * @public
 */
export interface RowPatchStream {
  /** Where the connection stands. */
  readonly status: Signal<RowPatchStreamStatus>;
  /** Why it closed or is reconnecting, if it failed. */
  readonly error: Signal<Error | null>;
  /** Close it now; it opens again when its URL or `enabled` changes. */
  readonly close: () => void;
}

/**
 * Bind a live row-patch feed to the host's rows. The connection opens while
 * a URL is set and `enabled` is true, closes when either changes or the
 * injection context is destroyed, and reconnects as `reconnect` says.
 *
 * @param options - See {@link RowPatchStreamOptions}.
 * @returns See {@link RowPatchStream}.
 *
 * @public
 */
export function injectRowPatchStream<TRow>(
  options: RowPatchStreamOptions<TRow>
): RowPatchStream {
  if (!options.injector) assertInInjectionContext(injectRowPatchStream);
  const injector = options.injector ?? inject(Injector);
  const status = signal<RowPatchStreamStatus>("idle");
  const error = signal<Error | null>(null);
  let open: { close: () => void } | undefined;
  const onStatus = (next: RowPatchStreamStatus, reason: Error | null): void => {
    status.set(next);
    error.set(reason);
  };
  const onMessage = (frame: string): void => {
    const parse = options.parse ?? parseRowPatchFrame<TRow>;
    const patches = parse(frame);
    if (patches.length === 0) return;
    options.onPatch((rows) => applyRowPatches(rows, patches, options.getRowId));
    options.onPatches?.(patches);
  };

  effect(
    (onCleanup) => {
      const websocket = readMaybe(options.websocket);
      const eventSource = readMaybe(options.eventSource);
      const enabled = readMaybe(options.enabled ?? true);
      untracked(() => {
        if (!enabled || (!websocket && !eventSource)) {
          status.set("idle");
          error.set(null);
          return;
        }
        const stream = openRowPatchStream({
          websocket,
          eventSource,
          event: options.event,
          protocols: options.protocols,
          reconnect: options.reconnect,
          createWebSocket: options.createWebSocket,
          createEventSource: options.createEventSource,
          onStatus,
          onMessage,
        });
        open = stream;
        onCleanup(() => {
          stream.close();
          open = undefined;
        });
      });
    },
    { injector }
  );

  return {
    status: status.asReadonly(),
    error: error.asReadonly(),
    close: () => {
      open?.close();
    },
  };
}
