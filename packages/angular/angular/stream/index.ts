/**
 * `@adapttable/angular/stream` — live row patches.
 *
 * A separate entry point, so a table that never opens a socket never
 * downloads one. Bind a WebSocket or a server-sent-events endpoint to the
 * rows a host already owns; the frames become ordinary row patches, and
 * everything downstream — filters, sort, grouping, aggregates — is the path a
 * patch already takes.
 *
 * ```ts
 * import { injectRowPatchStream } from "@adapttable/angular/stream";
 *
 * readonly rows = signal(initial);
 * readonly stream = injectRowPatchStream({
 *   websocket: "wss://api/rows",
 *   getRowId: (row) => row.id,
 *   onPatch: (update) => this.rows.update(update),
 * });
 * ```
 *
 * `injectChangedCellFlash` is here too: a patch that changes a cell nobody
 * touched says so, briefly, and only when the reader has not asked for
 * reduced motion.
 *
 * @packageDocumentation
 */
export {
  injectRowPatchStream,
  type RowPatchStream,
  type RowPatchStreamOptions,
} from "./rowPatchStream";
export {
  type Attrs,
  type ChangedCellFlash,
  type ChangedCellFlashOptions,
  injectChangedCellFlash,
  type MaybeSignal,
  type MaybeSignalOptional,
} from "@adapttable/angular";
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
} from "@adapttable/core";
export {
  isStreamLive,
  isStreamSettled,
  openRowPatchStream,
  parseRowPatchFrame,
} from "@adapttable/core";
