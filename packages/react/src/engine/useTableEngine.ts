/**
 * React subscription adapter for {@link createTableEngine}.
 * The engine owns state; this hook re-renders on revision bumps.
 */
import {
  createTableEngine,
  type CreateTableEngineOptions,
  devWarn,
  type TableEngine,
  type TableEngineReader,
} from "@adapttable/core";
import {
  useDebugValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { sameRows } from "./sameRows";

function revisionToken<TRow>(reader: TableEngineReader<TRow>): string {
  const revisions = reader.snapshot().revisions;
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
 * Move the engine's CANDIDATE to the options of the render now executing.
 *
 * Nothing published happens here. The committed state, its revision tokens
 * and every subscriber stay where they were; an agent reading the table
 * mid-render sees the table that is on screen, not one a render is still
 * deciding on. The candidate is published in a layout effect, which is the
 * point React has accepted the render — a render that suspends or is thrown
 * away never reaches it, and nothing leaked.
 *
 * The work is idempotent — a Strict Mode double render, or a render React
 * discards and replays, compares against the same recorded options and
 * stages the same candidate, never a partial one.
 */
function syncEngine<TRow>(
  engine: TableEngine<TRow>,
  options: CreateTableEngineOptions<TRow>,
  previous: LiveOptions<TRow> | undefined
): void {
  // A freshly created engine already carries these options.
  if (previous?.engine !== engine) return;

  // A fresh array holding the same rows is the same data: adopting it without
  // staging is what keeps an inline `data={[…]}` from re-deriving the whole
  // view — and, now that a commit publishes, from re-rendering forever.
  const dataChanged = !sameRows(previous.data, options.data);
  const columnsChanged = !Object.is(previous.columns, options.columns);

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
  if (changed || dataChanged || columnsChanged) {
    engine.stageCandidate(patch, {
      data: dataChanged ? options.data : undefined,
      columns: columnsChanged ? options.columns : undefined,
    });
  }

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
 * `getSearchText` stay live — a change is staged while the render runs and
 * published when React commits it, which is the same moment the screen
 * changes. `tableId` and `defaults` are read once.
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

  // The CANDIDATE's token, not the committed one: this render already holds
  // what it staged, and reading the committed token would report the table it
  // is replacing. A change from anywhere else moves both together.
  const publishingRef = useRef(false);
  const token = useSyncExternalStore(
    (onStoreChange) =>
      engine.subscribe("all", () => {
        // Our own commit is not news to us — the render that staged it is the
        // one being committed. Waking here would re-render, and a host who
        // builds `data` inline would hand over new rows and never settle.
        if (publishingRef.current) return;
        onStoreChange();
      }),
    () => revisionToken(engine.candidate),
    () => revisionToken(engine.candidate)
  );

  // The render was accepted: publish what it staged, before paint, so an
  // agent or a second component reads the table that is now on screen.
  useLayoutEffect(() => {
    publishingRef.current = true;
    try {
      engine.commitCandidate();
    } finally {
      publishingRef.current = false;
    }
  });

  useEffect(() => {
    const generation = ++generationRef.current;
    const owned = engine;
    return () => {
      // Anything a later render staged and never committed goes with it.
      owned.discardCandidate();
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
