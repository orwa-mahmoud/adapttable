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
  RemovePatch,
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
export { parseRowPatchFrame } from "./stream/parse";
export {
  isStreamLive,
  isStreamSettled,
  type RowPatchStreamStatus,
} from "./stream/status";
