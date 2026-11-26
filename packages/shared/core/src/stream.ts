/**
 * Live row patches — `@adapttable/core/stream`.
 *
 * The wire parser and socket opener live here. React hooks live on
 * `@adapttable/react/stream`.
 *
 * @packageDocumentation
 */
export type { RowPatch, RowPatchEvent } from "./rows/patch";
export type {
  InsertPatch,
  RekeyPatch,
  RemovePatch,
  RowPatchOptions,
  UpdatePatch,
  UpsertPatch,
} from "./rows/patch";
export {
  openRowPatchStream,
  type OpenRowPatchStreamOptions,
  type RowPatchStreamHandle,
  type RowPatchStreamReconnect,
  type StreamSocket,
  type StreamSocketEvent,
} from "./stream/connect";
export { parseRowPatchFrame, STREAMED_ROW_PATCHES } from "./stream/parse";
export {
  isStreamLive,
  isStreamSettled,
  type RowPatchStreamStatus,
} from "./stream/status";
