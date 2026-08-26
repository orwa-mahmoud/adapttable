/**
 * Live row patches — `@adapttable/core/stream`.
 *
 * A separate entry point, so a table that never opens a socket never
 * downloads one. Bind a WebSocket or an SSE endpoint to the rows a host
 * already owns; the frames become ordinary row patches, and everything
 * downstream — filters, sort, grouping, aggregates — is the path a patch
 * already takes.
 *
 * ```tsx
 * import { useRowPatchStream } from "@adapttable/core/stream";
 *
 * const [rows, setRows] = useState(initial);
 * const stream = useRowPatchStream({
 *   websocket: "wss://api/rows",
 *   getRowId: (row) => row.id,
 *   onPatch: setRows,
 * });
 * ```
 * `useChangedCellFlash` lives here too: a patch that changes a cell nobody
 * touched should say so, briefly, and only when the reader has not asked for
 * reduced motion.
 */
export {
  type ChangedCellFlashState,
  useChangedCellFlash,
  type UseChangedCellFlashOptions,
} from "./rows/changedCellFlash";
export {
  openRowPatchStream,
  type OpenRowPatchStreamOptions,
  type RowPatchStreamHandle,
  type RowPatchStreamReconnect,
  type StreamSocket,
  type StreamSocketEvent,
} from "./stream/connect";
export { parseRowPatchFrame } from "./stream/parse";
export {
  isStreamLive,
  isStreamSettled,
  type RowPatchStreamStatus,
} from "./stream/status";
export {
  type RowPatchStreamState,
  useRowPatchStream,
  type UseRowPatchStreamOptions,
} from "./stream/useRowPatchStream";
