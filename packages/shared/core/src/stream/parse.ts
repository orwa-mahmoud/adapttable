/**
 * A text frame from the wire, turned into row patches.
 *
 * The wire format is deliberately the patch shape the table already has:
 * one patch, or an array of them, as JSON. A server that already speaks
 * `{ type: "update", id, changes }` needs no translation layer, and one
 * that speaks something else supplies its own `parse`. A streamed update
 * that changes a row's id is applied as a rekey.
 *
 * Nothing here trusts the wire. A frame that is not JSON, an entry that is
 * not an object, a patch with no usable `type` or a `remove` with no id —
 * each is dropped rather than applied, because a malformed frame must not
 * be able to empty a table.
 */

import type { RowPatch, RowPatchOptions } from "../contracts/rows";
import { isRecord } from "../utils/isRecord";

export type { RowPatch };

/**
 * How a streamed frame's patches are applied: a server that sends a rename as
 * an id-changing update is read as a rekey.
 *
 * @public
 */
export const STREAMED_ROW_PATCHES: RowPatchOptions = Object.freeze({
  rekeyUpdates: true,
});

/** One entry of a frame, before it is known to be a patch. */

/** A string id, or `undefined` when the field cannot serve as one. */
function idOf(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/**
 * One entry as a patch, or `undefined` when it is not one.
 *
 * @typeParam TRow - The row type.
 * @param entry - A parsed frame entry.
 * @returns The patch, or `undefined` to drop it.
 */
function toPatch<TRow>(entry: unknown): RowPatch<TRow> | undefined {
  if (!isRecord(entry)) return undefined;
  switch (entry.type) {
    case "insert": {
      if (!isRecord(entry.row)) return undefined;
      const at = typeof entry.at === "number" ? entry.at : undefined;
      return { type: "insert", row: entry.row as TRow, at };
    }
    case "update":
    case "rekey": {
      const id = idOf(entry.id);
      if (id === undefined || !isRecord(entry.changes)) return undefined;
      return {
        type: entry.type,
        id,
        changes: entry.changes as Partial<TRow>,
      };
    }
    case "upsert": {
      if (!isRecord(entry.row)) return undefined;
      return { type: "upsert", row: entry.row as TRow };
    }
    case "remove": {
      const id = idOf(entry.id);
      return id === undefined ? undefined : { type: "remove", id };
    }
    default:
      return undefined;
  }
}

/**
 * Parse a text frame into the patches it carries.
 *
 * @typeParam TRow - The row type.
 * @param frame - The raw text from the socket.
 * @returns Every well-formed patch in the frame; empty when there are none.
 *
 * @public
 */
export function parseRowPatchFrame<TRow>(
  frame: string
): readonly RowPatch<TRow>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame);
  } catch {
    // A frame that is not JSON is not a patch. Dropping it is the whole
    // handling: throwing here would take the connection down with it.
    return [];
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const patches: RowPatch<TRow>[] = [];
  for (const entry of entries) {
    const patch = toPatch<TRow>(entry);
    if (patch) patches.push(patch);
  }
  return patches;
}

export type {
  InsertPatch,
  RemovePatch,
  UpdatePatch,
  UpsertPatch,
} from "../rows/patch";
