/**
 * Carrying a rekey through a table's state.
 *
 * A rekey (`rekeyRow`) gives a row a new id. Everything the table keeps by
 * row id — the selection, pins, open details and tree nodes, edit drafts —
 * has to follow it in the same change, or the selection would quietly lose
 * the row. Each piece of that state registers how it remaps; the binding
 * commits the new data, and every registered piece moves at once.
 */
import type { RowPatchEvent, RowPatchLog } from "../contracts/rows";
import { rowPatchLog, rowPatchLogStartsAt, rowRekeys } from "../rows/patch";
import type { RowPinState } from "../rows/rowPinModel";
import type { TableStore } from "./tableStore";

/**
 * How one piece of a table's state follows the rows a patch log rekeyed.
 *
 * @public
 */
export type RowRekeyHandler<TRow = unknown> = (log: RowPatchLog<TRow>) => void;

const handlersOf = new WeakMap<TableStore, Set<RowRekeyHandler>>();

/**
 * Register how one piece of a table's state follows a rekey.
 *
 * @param store - The table's store.
 * @param handler - Remaps the piece of state; runs inside one store change.
 * @returns What unregisters it.
 *
 * @public
 */
export function onRowRekeys<TRow>(
  store: TableStore,
  handler: RowRekeyHandler<TRow>
): () => void {
  let handlers = handlersOf.get(store);
  if (!handlers) {
    handlers = new Set();
    handlersOf.set(store, handlers);
  }
  // The store holds this table's rows; the handler names their type.
  const erased: RowRekeyHandler = (log) => {
    handler(log as RowPatchLog<TRow>);
  };
  handlers.add(erased);
  const owned = handlers;
  return () => {
    owned.delete(erased);
  };
}

function rekeys(log: RowPatchLog<unknown>): boolean {
  return log.events.some(
    (event) => event.type === "update" && event.from !== undefined
  );
}

/**
 * Move every registered piece of a table's state to the ids a patch log
 * gave its rows, in one store change. A log that rekeyed no row does
 * nothing.
 *
 * @param store - The table's store.
 * @param log - The log the patches produced.
 *
 * @public
 */
export function rekeyTableRows(
  store: TableStore,
  log: RowPatchLog<unknown>
): void {
  const handlers = handlersOf.get(store);
  if (!handlers || handlers.size === 0 || !rekeys(log)) return;
  store.batch(() => {
    for (const handler of [...handlers]) handler(log);
  });
}

/**
 * Carry the rekeys of newly committed data through the table's state: when
 * `data` carries a patch log that continues from `previous`, its rekeys move
 * every registered piece of state. Other new arrays change no id.
 *
 * @param store - The table's store.
 * @param previous - The data the table showed before.
 * @param data - The data it shows now.
 *
 * @public
 */
export function commitRowRekeys<TRow>(
  store: TableStore,
  previous: readonly TRow[] | undefined,
  data: readonly TRow[]
): void {
  if (previous === undefined || previous === data) return;
  const log = rowPatchLog(data);
  if (!log || !rowPatchLogStartsAt(log, previous)) return;
  rekeyTableRows(store, log);
}

/**
 * The ids a function derives, from each rekeyed row's value before the log to
 * its value after it. With the row-id function this is the rekey map; with a
 * separate selection id it moves only the ids the rekey changed. Chained
 * rekeys collapse, a row rekeyed back drops out, and a rekeyed row the log
 * then removed is not listed.
 *
 * @param log - The log the patches produced.
 * @param getId - The id to follow.
 * @returns Old id to new id.
 *
 * @public
 */
export function rekeyedIds<TRow>(
  log: RowPatchLog<TRow>,
  getId: (row: TRow) => string
): ReadonlyMap<string, string> {
  const moved = new Map<string, string>();
  const originOf = new Map<TRow, string>();
  const removed = (event: RowPatchEvent<TRow>): void => {
    if (event.type !== "remove") return;
    const origin = originOf.get(event.row);
    if (origin !== undefined) moved.delete(origin);
  };
  for (const event of log.events) {
    removed(event);
    if (event.type !== "update") continue;
    const origin = originOf.get(event.prev);
    if (event.from === undefined) {
      // A plain update replaces the row object; its lineage carries on.
      if (origin !== undefined) originOf.set(event.next, origin);
      continue;
    }
    const before = origin ?? getId(event.prev);
    const after = getId(event.next);
    originOf.set(event.next, before);
    if (before === after) moved.delete(before);
    else moved.set(before, after);
  }
  return moved;
}

/**
 * An id set with each rekeyed id moved; the same set when none moved.
 *
 * @param ids - The ids.
 * @param moved - Old id to new id.
 * @returns The ids after the rekey.
 *
 * @public
 */
export function rekeyIdSet(
  ids: ReadonlySet<string>,
  moved: ReadonlyMap<string, string>
): ReadonlySet<string> {
  if (![...ids].some((id) => moved.has(id))) return ids;
  return new Set([...ids].map((id) => moved.get(id) ?? id));
}

/**
 * An id list with each rekeyed id moved in place; the same list when none
 * moved.
 *
 * @param ids - The ids.
 * @param moved - Old id to new id.
 * @returns The ids after the rekey.
 *
 * @public
 */
export function rekeyIdList(
  ids: readonly string[],
  moved: ReadonlyMap<string, string>
): readonly string[] {
  if (!ids.some((id) => moved.has(id))) return ids;
  return ids.map((id) => moved.get(id) ?? id);
}

/**
 * A record keyed by row id with each rekeyed entry moved to its new key; the
 * same record when none moved.
 *
 * @param record - The record.
 * @param moved - Old id to new id.
 * @returns The record after the rekey.
 *
 * @public
 */
export function rekeyIdRecord<T>(
  record: Readonly<Record<string, T>>,
  moved: ReadonlyMap<string, string>
): Readonly<Record<string, T>> {
  if (!Object.keys(record).some((id) => moved.has(id))) return record;
  const next: Record<string, T> = {};
  for (const [id, value] of Object.entries(record)) {
    next[moved.get(id) ?? id] = value;
  }
  return next;
}

/**
 * A set of row ids after a rekey: the open details, the expanded tree nodes.
 *
 * @param ids - The row ids.
 * @param log - The log the patches produced.
 * @returns The ids after the rekey; the same set when none moved.
 *
 * @public
 */
export function rekeyRowIdSet(
  ids: ReadonlySet<string>,
  log: RowPatchLog<unknown>
): ReadonlySet<string> {
  return rekeyIdSet(ids, rowRekeys(log));
}

/**
 * The pinned rows after a rekey, each keeping its side and place.
 *
 * @param pins - The pinned row ids.
 * @param log - The log the patches produced.
 * @returns The pins after the rekey; the same pins when none moved.
 *
 * @public
 */
export function rekeyRowPins(
  pins: RowPinState,
  log: RowPatchLog<unknown>
): RowPinState {
  const moved = rowRekeys(log);
  const top = rekeyIdList(pins.top, moved);
  const bottom = rekeyIdList(pins.bottom, moved);
  return top === pins.top && bottom === pins.bottom ? pins : { top, bottom };
}
