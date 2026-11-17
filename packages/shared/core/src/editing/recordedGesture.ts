import type { CellEdit } from "../focus/cellEdits";
import { isThenable } from "./storePlumbing";

/** Internal channel: capture undo values now, publish them after host success. */
export const PREPARE_RECORDING = /* @__PURE__ */ Symbol(
  "prepare edit history recording"
);

type Recorder<TRow> = ((edits: readonly CellEdit<TRow>[]) => void) & {
  [PREPARE_RECORDING]?: (edits: readonly CellEdit<TRow>[]) => () => void;
};

/** Plain host-owned record callbacks retain their existing eager contract. */
export function recordedGesture<TRow>(
  record: Recorder<TRow>,
  edits: readonly CellEdit<TRow>[],
  apply: () => unknown
): unknown {
  const prepare = record[PREPARE_RECORDING];
  if (!prepare) {
    record(edits);
    return apply();
  }
  const commit = prepare(edits);
  const result = apply();
  if (isThenable(result)) {
    return Promise.resolve(result).then((value) => {
      commit();
      return value;
    });
  }
  commit();
  return result;
}
