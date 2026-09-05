/**
 * React subscription adapter for {@link createTableEngine}.
 * The engine owns state; this hook re-renders on revision bumps.
 */
import {
  createTableEngine,
  type CreateTableEngineOptions,
  devWarn,
  type TableEngine,
} from "@adapttable/core";
import { useDebugValue, useEffect, useRef, useSyncExternalStore } from "react";

function revisionToken<TRow>(engine: TableEngine<TRow>): string {
  const revisions = engine.snapshot().revisions;
  return `${revisions.data}:${revisions.view}:${revisions.schema}:${revisions.policy}`;
}

/**
 * The options this hook keeps replaying onto the committed engine. Anything
 * absent here is read once, at creation: `tableId` is the table's identity
 * and `defaults` are seed values a later render cannot retroactively change.
 */
interface LiveOptions<TRow> {
  engine: TableEngine<TRow>;
  data: readonly TRow[];
  columns: CreateTableEngineOptions<TRow>["columns"];
  rowKey: CreateTableEngineOptions<TRow>["rowKey"];
  paginationMode: CreateTableEngineOptions<TRow>["paginationMode"];
  locale: string | undefined;
  filterFn: CreateTableEngineOptions<TRow>["filterFn"];
  getSearchText: CreateTableEngineOptions<TRow>["getSearchText"];
  tableId: string | undefined;
}

function readLive<TRow>(
  engine: TableEngine<TRow>,
  options: CreateTableEngineOptions<TRow>
): LiveOptions<TRow> {
  return {
    engine,
    data: options.data,
    columns: options.columns,
    rowKey: options.rowKey,
    paginationMode: options.paginationMode,
    locale: options.locale,
    filterFn: options.filterFn,
    getSearchText: options.getSearchText,
    tableId: options.tableId,
  };
}

/**
 * Move the engine to the options of the render now executing.
 *
 * Every write is silent: it bumps the revision without notifying, so the
 * render that supplied the options reads them back immediately and no
 * subscriber is woken mid-render. That also keeps a host who passes a fresh
 * `data` array literal on every render from driving an update loop.
 *
 * The work is idempotent — a Strict Mode double render, or a render React
 * discards and replays, compares against the same recorded options and
 * performs the same assignment, never a partial one.
 */
function syncEngine<TRow>(
  engine: TableEngine<TRow>,
  options: CreateTableEngineOptions<TRow>,
  previous: LiveOptions<TRow> | undefined
): void {
  // A freshly created engine already carries these options.
  if (previous?.engine !== engine) return;

  const dataChanged = !Object.is(previous.data, options.data);
  const columnsChanged = !Object.is(previous.columns, options.columns);
  if (dataChanged || columnsChanged) {
    engine.invalidate(
      [],
      {
        data: dataChanged ? options.data : undefined,
        columns: columnsChanged ? options.columns : undefined,
      },
      { silent: true }
    );
  }

  const patch: {
    getRowId?: CreateTableEngineOptions<TRow>["rowKey"];
    locale?: string;
    paginationMode?: "paged" | "infinite";
    filterFn?: NonNullable<CreateTableEngineOptions<TRow>["filterFn"]>;
    getSearchText?: NonNullable<
      CreateTableEngineOptions<TRow>["getSearchText"]
    >;
  } = {};
  let changed = false;
  if (!Object.is(previous.rowKey, options.rowKey)) {
    patch.getRowId = options.rowKey;
    changed = true;
  }
  if (previous.locale !== options.locale) {
    patch.locale = options.locale;
    changed = true;
  }
  if (previous.paginationMode !== options.paginationMode) {
    patch.paginationMode = options.paginationMode ?? "paged";
    changed = true;
  }
  if (!Object.is(previous.filterFn, options.filterFn)) {
    patch.filterFn = options.filterFn;
    changed = true;
  }
  if (!Object.is(previous.getSearchText, options.getSearchText)) {
    patch.getSearchText = options.getSearchText;
    changed = true;
  }
  if (changed) engine.configure(patch, { silent: true });

  if (previous.tableId !== options.tableId) {
    devWarn(
      `useTableEngine: tableId changed from "${String(previous.tableId)}" to "${String(options.tableId)}" — it identifies the table and is read once, at creation. Remount the table to change it.`
    );
  }
}

/**
 * Subscribe a React tree to one engine. Two calls create two isolated tables.
 *
 * `data`, `columns`, `rowKey`, `paginationMode`, `locale`, `filterFn` and
 * `getSearchText` stay live — a change is committed to the engine and
 * published on the next revision. `tableId` and `defaults` are read once.
 *
 * @public
 */
export function useTableEngine<TRow>(
  options: CreateTableEngineOptions<TRow>
): TableEngine<TRow> {
  const engineRef = useRef<TableEngine<TRow> | undefined>(undefined);
  const generationRef = useRef(0);
  engineRef.current ??= createTableEngine(options);
  const engine = engineRef.current;

  const liveRef = useRef<LiveOptions<TRow> | undefined>(undefined);
  syncEngine(engine, options, liveRef.current);
  liveRef.current = readLive(engine, options);

  const token = useSyncExternalStore(
    (onStoreChange) => engine.subscribe("all", onStoreChange),
    () => revisionToken(engine),
    () => revisionToken(engine)
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    const owned = engine;
    return () => {
      queueMicrotask(() => {
        if (generationRef.current !== generation) return;
        owned.dispose();
        if (engineRef.current === owned) engineRef.current = undefined;
        if (liveRef.current?.engine === owned) liveRef.current = undefined;
      });
    };
  }, [engine]);

  useDebugValue(token);
  return engine;
}
