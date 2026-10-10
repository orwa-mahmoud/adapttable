/** Host-owned row updates, with resource ownership tied to the Vue scope. */
import {
  applyRowPatches,
  openRowPatchStream,
  parseRowPatchFrame,
  type RowPatch,
  type RowPatchStreamHandle,
  type RowPatchStreamReconnect,
  type RowPatchStreamStatus,
  type StreamSocket,
} from "@adapttable/core";
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

import { requireScope, useScopeActivity } from "./store";
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
