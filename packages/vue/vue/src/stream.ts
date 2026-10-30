/** Host-owned row updates, with resource ownership tied to the Vue scope. */
import {
  applyRowPatches,
  CHANGED_CELL_FLASH_MS,
  createChangedCellFlashStore,
  openRowPatchStream,
  parseRowPatchFrame,
  type RowPatch,
  type RowPatchStreamHandle,
  type RowPatchStreamReconnect,
  type RowPatchStreamStatus,
  type StreamSocket,
} from "@adapttable/core";
import type { ChangedCellFlashState } from "@adapttable/core/binding";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowReadonly,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { requireScope, useExternalStore, useScopeActivity } from "./store";
export type { ChangedCellFlashState } from "@adapttable/core/binding";
export type {
  InsertPatch,
  OpenRowPatchStreamOptions,
  RemovePatch,
  RowPatch,
  RowPatchEvent,
  RowPatchStreamHandle,
  RowPatchStreamReconnect,
  RowPatchStreamStatus,
  StreamSocket,
  StreamSocketEvent,
  UpdatePatch,
  UpsertPatch,
} from "@adapttable/core/stream";
export {
  isStreamLive,
  isStreamSettled,
  openRowPatchStream,
  parseRowPatchFrame,
} from "@adapttable/core/stream";
export interface UseRowPatchStreamOptions<TRow> {
  readonly websocket?: string;
  readonly eventSource?: string;
  readonly event?: string;
  readonly protocols?: string | string[];
  readonly reconnect?: RowPatchStreamReconnect;
  readonly getRowId: (row: TRow) => string;
  readonly onPatch: (
    update: (rows: readonly TRow[]) => readonly TRow[]
  ) => void;
  readonly parse?: (frame: string) => readonly RowPatch<TRow>[];
  readonly enabled?: boolean;
  readonly onPatches?: (patches: readonly RowPatch<TRow>[]) => void;
  readonly createWebSocket?: (
    url: string,
    protocols?: string | string[]
  ) => StreamSocket | undefined;
  readonly createEventSource?: (url: string) => StreamSocket | undefined;
}
export function useRowPatchStream<TRow>(
  input: MaybeRefOrGetter<UseRowPatchStreamOptions<TRow>>
) {
  requireScope("useRowPatchStream");
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  const status: ShallowRef<RowPatchStreamStatus> =
    shallowRef<RowPatchStreamStatus>("idle");
  const error: ShallowRef<Error | null> = shallowRef<Error | null>(null);
  const closed = shallowRef(false);
  let handle: RowPatchStreamHandle | undefined;
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    handle?.close();
    handle = undefined;
  });
  watch(
    [
      () => active.value,
      () => closed.value,
      () => options.value.enabled ?? true,
      () => options.value.websocket,
      () => options.value.eventSource,
      () => options.value.event,
      () => options.value.protocols,
      () => options.value.reconnect?.delayMs,
      () => options.value.reconnect?.maxAttempts,
      () => options.value.createWebSocket,
      () => options.value.createEventSource,
    ],
    ([isActive, isClosed, enabled], _previous, onCleanup) => {
      let current = true;
      const connection: { handle?: RowPatchStreamHandle } = {};
      onCleanup(() => {
        current = false;
        connection.handle?.close();
        if (handle === connection.handle) handle = undefined;
      });
      if (!isActive || isClosed || !enabled || disposed) {
        status.value = "idle";
        error.value = null;
        return;
      }
      const value = options.value;
      connection.handle = openRowPatchStream({
        ...value,
        onStatus: (next, reason) => {
          if (current && !disposed) {
            status.value = next;
            error.value = reason;
          }
        },
        onMessage: (frame) => {
          if (!current || disposed || !active.value || closed.value) return;
          const latest = options.value;
          const patches = (latest.parse ?? parseRowPatchFrame<TRow>)(frame);
          if (!patches.length) return;
          latest.onPatch((rows) =>
            applyRowPatches(rows, patches, latest.getRowId)
          );
          if (current && !disposed) latest.onPatches?.(patches);
        },
      });
      if (current && !disposed) handle = connection.handle;
      else connection.handle.close();
    },
    { immediate: true, flush: "sync" }
  );
  return {
    status: shallowReadonly(status),
    error: shallowReadonly(error),
    close: () => {
      closed.value = true;
    },
  };
}
export type RowPatchStreamState = ReturnType<typeof useRowPatchStream>;

/** Options for {@link useChangedCellFlash}. @public */
export interface UseChangedCellFlashOptions {
  /** Whether changed cells are marked. Defaults to `false`. */
  readonly enabled?: boolean;
  /** How long a mark lasts, in milliseconds. Defaults to 1200. */
  readonly durationMs?: number;
}

/** What an unmarked cell carries. */
const NO_FLASH: Record<string, never> = {};
/** What a marked cell carries. */
const FLASH: { "data-flash": "" } = { "data-flash": "" };

/**
 * Mark the cells a live patch changed, briefly — and not at all when the
 * reader prefers reduced motion. Pass `isFlashing` to the table's
 * `isCellFlashing` and feed `mark` the events a patch produced.
 * @public
 */
export function useChangedCellFlash(
  input: MaybeRefOrGetter<UseChangedCellFlashOptions> = {}
): ChangedCellFlashState {
  requireScope("useChangedCellFlash");
  const options = computed(() => toValue(input));
  const reduced = usePrefersReducedMotion();
  const config = computed(() => ({
    live: (options.value.enabled ?? false) && !reduced.value,
    durationMs: options.value.durationMs ?? CHANGED_CELL_FLASH_MS,
  }));
  const store = createChangedCellFlashStore(config.value);
  // A new generation per mark and per fade, so whatever read a cell's state
  // reads it again.
  const generation = useExternalStore(store);
  // Turning it off, or a reduced-motion preference arriving, drops what is
  // already on screen rather than leaving it lit.
  watch(
    config,
    (next) => {
      store.configure(next);
      if (!next.live) store.clear();
    },
    { flush: "sync" }
  );
  // Timers must not outlive the table.
  onScopeDispose(store.clear);
  // Reading the generation is what makes a render track the store.
  const live = (): boolean => generation.value >= 0 && config.value.live;
  const isFlashing = (rowId: string, columnKey: string): boolean =>
    live() && store.isFlashing(rowId, columnKey);
  return {
    isFlashing,
    isRowFlashing: (rowId) => live() && store.isRowFlashing(rowId),
    flashProps: (rowId, columnKey) =>
      isFlashing(rowId, columnKey) ? FLASH : NO_FLASH,
    mark: store.mark,
    clear: store.clear,
  };
}

/** `prefers-reduced-motion: reduce`, followed live; false without a window. */
function usePrefersReducedMotion(): Readonly<ShallowRef<boolean>> {
  const reduced = shallowRef(false);
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return shallowReadonly(reduced);
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const read = (): void => {
    reduced.value = media.matches;
  };
  read();
  media.addEventListener("change", read);
  onScopeDispose(() => {
    media.removeEventListener("change", read);
  });
  return shallowReadonly(reduced);
}
