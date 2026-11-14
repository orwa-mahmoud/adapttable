import {
  applyRowPatches,
  applyRowPatchesWithLog,
  updateRow,
} from "@adapttable/core";
import { getLabels } from "@adapttable/i18n";
import {
  type CellProps,
  type ColumnDef,
  useFrontendData,
  useServerData,
} from "@adapttable/react";
import {
  editing as editing_,
  rowAppearance,
  tree as tree_,
  virtualize as virtualize_,
} from "@adapttable/react/features";
import { useEffect, useMemo, useRef, useState } from "react";

import { initialDemoDirection, initialDemoLocale } from "./demoPresentation";
import { kitClassNames, KitProvider, kitTable } from "./kitProviders";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { useNavHeight } from "./sections";
import {
  type BigPerson,
  makeBigList,
  paddingColumns,
  SCALE_COLUMNS,
  SCALE_SLICE,
  SCALE_TREE_FANOUT,
  scaleParams,
  scalePlaceholder,
  scaleRowKey,
  serverSlice,
  variableRowHeight,
} from "./shared/scaleScenario";

function PersonCell({ row }: Readonly<CellProps<BigPerson>>) {
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{row.name}</div>
      <div style={{ fontSize: 12, color: "var(--mantine-color-dimmed)" }}>
        {row.email}
      </div>
    </div>
  );
}

const COLUMNS: ColumnDef<BigPerson>[] = SCALE_COLUMNS.map((column) =>
  column.key === "name" ? { ...column, Cell: PersonCell } : { ...column }
);

/**
 * Pad the column set out to `cols` for the wide-table benchmark: the real
 * columns first, then synthetic ones reading a rotating field. Returns the
 * untouched set when the knob is absent, so the demo is unaffected.
 */
function widen(
  columns: ColumnDef<BigPerson>[],
  cols: number,
  edit = false
): ColumnDef<BigPerson>[] {
  const base = edit
    ? columns.map((column) =>
        column.key === "budget"
          ? {
              ...column,
              editable: true,
              editor: "number" as const,
              editValue: (r: BigPerson) => String(r.budget),
            }
          : column
      )
    : columns;
  return [...base, ...paddingColumns(base.length, cols)];
}

/**
 * The server-backed arm: the table asks for a slice, this answers it, and the
 * browser never holds the set. `total` is what the pager and the ARIA counts
 * report, so 1,000,000 means 1,000,000.
 */

function ServerScaleTable({
  total,
  columns,
  virtual,
  virtualCols,
  variableHeight,
  dark,
  kit,
}: Readonly<{
  total: number;
  columns: ColumnDef<BigPerson>[];
  virtual: boolean;
  virtualCols: boolean;
  variableHeight: boolean;
  dark: boolean;
  kit: string;
}>) {
  const [page, setPage] = useState({ from: 0, limit: SCALE_SLICE });
  const rows = useMemo(
    () => serverSlice(page.from, page.limit, total),
    [page, total]
  );
  const source = useServerData<BigPerson>({
    rows,
    total,
    urlKey: "scale",
    urlSync: false,
    paginationMode: "infinite",
    defaults: { limit: SCALE_SLICE },
    onQueryChange: (query) => {
      setPage({ from: (query.page - 1) * query.limit, limit: query.limit });
    },
  });
  const Table = kitTable<BigPerson>(kit);
  const navHeight = useNavHeight();
  return (
    <KitProvider kit={kit} dark={dark} dir={initialDemoDirection()}>
      <Table
        dir={initialDemoDirection()}
        source={source}
        columns={columns}
        rowKey={scaleRowKey}
        labels={getLabels(initialDemoLocale())}
        urlSync={false}
        searchPlaceholder={scalePlaceholder(total)}
        // The window is what this page exists to show, so it is imported —
        // and the import carries its own configuration.
        features={[
          ...(virtual
            ? [
                virtualize_({
                  virtualizeColumns: virtualCols,
                  estimateRowSize: 48,
                }),
              ]
            : []),
          ...(variableHeight
            ? [rowAppearance<BigPerson>({ rowHeight: variableRowHeight })]
            : []),
        ]}
        classNames={kitClassNames(kit)}
        stickyHeader
        stickyTop={navHeight}
      />
    </KitProvider>
  );
}

/** The kit's own table, element-virtualized over tens of thousands of rows. */
export function ScaleDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const kit = adapter;
  const {
    total,
    virtual,
    virtualCols,
    all,
    cols,
    server,
    edit,
    patches,
    incremental,
    tree,
    variableHeight,
  } = scaleParams();
  const columns = useMemo(() => widen(COLUMNS, cols, edit), [cols, edit]);
  if (server) {
    return (
      <div className="mx-demo">
        <div className="mx-demo__body" data-adapter={kit}>
          <ServerScaleTable
            total={total}
            columns={columns}
            virtual={virtual}
            virtualCols={virtualCols}
            variableHeight={variableHeight}
            dark={dark}
            kit={kit}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="mx-demo">
      <div className="mx-demo__body" data-adapter={kit}>
        <FrontendScaleTable
          total={total}
          columns={columns}
          virtual={virtual}
          virtualCols={virtualCols}
          variableHeight={variableHeight}
          all={all}
          edit={edit}
          patches={patches}
          incremental={incremental}
          tree={tree}
          dark={dark}
          kit={kit}
        />
      </div>
    </div>
  );
}

/** The in-memory arm, plus the editing and realtime-patch scenarios. */
function FrontendScaleTable({
  total,
  columns,
  virtual,
  virtualCols,
  variableHeight,
  all,
  edit,
  patches,
  incremental,
  tree,
  dark,
  kit,
}: Readonly<{
  total: number;
  columns: ColumnDef<BigPerson>[];
  virtual: boolean;
  virtualCols: boolean;
  variableHeight: boolean;
  all: boolean;
  edit: boolean;
  patches: number;
  incremental: boolean;
  tree: boolean;
  dark: boolean;
  kit: string;
}>) {
  const initial = useMemo(() => makeBigList(total), [total]);
  const [rows, setRows] = useState<readonly BigPerson[]>(initial);
  // Realtime patches: `?patch=N` applies N updates through the patch API the
  // same way a websocket would. `?incremental=1` keeps the patch log, which is
  // what engages the incremental engine — without it the pipeline rebuilds the
  // whole view per patch, and the benchmark runs both to make the difference a
  // measured number rather than a claim.
  const [applied, setApplied] = useState(0);
  const [burstMs, setBurstMs] = useState<number | undefined>(undefined);
  const pipelineName = incremental ? "incremental" : "full";
  const burstStart = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (patches <= 0) return;
    let done = 0;
    const byId = (row: BigPerson) => String(row.id);
    // Stamped before the first patch is dispatched, read after the last one
    // has been committed to the DOM — the burst, not the mount.
    const startedAt = performance.now();
    const tick = () => {
      setRows((current) => {
        const patch = [
          updateRow<BigPerson>(String((done % total) + 1), {
            budget: 40000 + ((done * 977) % 180000),
          }),
        ];
        const next = applyRowPatchesWithLog(current, patch, byId).rows;
        // The log is memoized against the returned array, and `applyRowPatches`
        // is the same call underneath — so choosing between the two APIs does
        // not choose a pipeline. Copying the array is the documented way to
        // drop the log, and it is what makes this arm a real full rebuild.
        return incremental ? next : [...next];
      });
      done += 1;
      setApplied(done);
      // Yield so React can paint `data-bench-patches` between updates;
      // `queueMicrotask` starves the waiter until the whole burst is queued.
      if (done < patches) setTimeout(tick, 0);
    };
    burstStart.current = startedAt;
    tick();
  }, [patches, total, incremental]);

  // React commits the DOM before effects run, so the render carrying the final
  // patch is already on screen here — this is "after the last one rendered",
  // not "after the last one was dispatched".
  useEffect(() => {
    if (patches <= 0 || applied < patches) return;
    const startedAt = burstStart.current;
    if (startedAt === undefined) return;
    burstStart.current = undefined;
    setBurstMs(performance.now() - startedAt);
  }, [applied, patches]);
  // `?tree=1` reads the same flat list as a hierarchy — every tenth row is a
  // root and the nine after it are its children — so the benchmark measures
  // the tree model's cost over rows it already builds, with nothing else
  // changed. Every root starts open, so the visible list is the full 50k and
  // virtualization is what has to hold it down.
  const treeShape = useMemo(() => {
    if (!tree) return undefined;
    const roots: string[] = [];
    for (let id = 1; id <= total; id += SCALE_TREE_FANOUT)
      roots.push(String(id));
    return {
      getParentId: (row: BigPerson) =>
        (row.id - 1) % SCALE_TREE_FANOUT === 0
          ? undefined
          : String(row.id - ((row.id - 1) % SCALE_TREE_FANOUT)),
      expandedIds: roots,
    };
  }, [tree, total]);
  const source = useFrontendData<BigPerson>({
    data: rows,
    columns,
    urlKey: "scale",
    urlSync: false,
    // Virtualization needs a continuous list, not pages: infinite mode keeps
    // ONE growing window that the virtualizer extends automatically whenever
    // the scroller nears the end (no Load-more button needed). `?all=1` loads
    // the whole list up front so the non-virtualized A/B arm renders every row.
    paginationMode: "infinite",
    defaults: { limit: all ? total : SCALE_SLICE },
  });
  const Table = kitTable<BigPerson>(kit);
  const navHeight = useNavHeight();
  const onScaleCellEdit = (
    row: BigPerson,
    _key: string,
    nextValue: unknown
  ) => {
    setRows((current) =>
      applyRowPatches(
        current,
        [updateRow<BigPerson>(String(row.id), { budget: Number(nextValue) })],
        scaleRowKey
      )
    );
  };
  return (
    <KitProvider kit={kit} dark={dark} dir={initialDemoDirection()}>
      {/* The benchmark reads these to know the burst finished and how long
          it took: the count to wait on, the elapsed time to report. */}
      <div
        data-bench-patches={patches > 0 ? applied : undefined}
        data-bench-burst-ms={
          burstMs === undefined ? undefined : burstMs.toFixed(2)
        }
        data-bench-pipeline={patches > 0 ? pipelineName : undefined}
      >
        <Table
          dir={initialDemoDirection()}
          source={source}
          columns={columns}
          rowKey={scaleRowKey}
          labels={getLabels(initialDemoLocale())}
          urlSync={false}
          searchPlaceholder={scalePlaceholder(total)}
          // Imported, not switched on: the window, the tree and the editor
          // each arrive with the feature that draws them.
          features={[
            ...(virtual
              ? [
                  virtualize_({
                    virtualizeColumns: virtualCols,
                    estimateRowSize: 48,
                  }),
                ]
              : []),
            ...(variableHeight
              ? [rowAppearance<BigPerson>({ rowHeight: variableRowHeight })]
              : []),
            ...(treeShape
              ? [
                  tree_<BigPerson>({
                    getParentId: treeShape.getParentId,
                    expandedIds: treeShape.expandedIds,
                  }),
                ]
              : []),
            ...(edit ? [editing_<BigPerson>(onScaleCellEdit)] : []),
          ]}
          classNames={kitClassNames(kit)}
          // Page-scroll window mode with a pinned header: the page itself
          // scrolls the 50k rows while the header sticks under the app nav.
          stickyHeader
          stickyTop={navHeight}
        />
      </div>
    </KitProvider>
  );
}
