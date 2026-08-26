import type { CellProps, ColumnDef } from "@adapttable/core";
import {
  applyRowPatches,
  applyRowPatchesWithLog,
  updateRow,
  useFrontendData,
  useServerData,
} from "@adapttable/core";
import { getLabels } from "@adapttable/i18n";
import { useEffect, useMemo, useRef, useState } from "react";

import { kitClassNames, KitProvider, kitTable } from "./kitProviders";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { useNavHeight } from "./sections";

interface BigPerson {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  budget: number;
}

const FIRST = [
  "Amara",
  "Diego",
  "Priya",
  "Sefa",
  "Lena",
  "Marcus",
  "Yuki",
  "Fatima",
  "Tomas",
  "Chioma",
  "Henrik",
  "Sofia",
  "Omar",
  "Grace",
  "Noah",
  "Aisha",
  "Lucas",
  "Mira",
  "Daniel",
  "Elena",
  "Kwame",
  "Bella",
  "Rohan",
  "Hannah",
];
const LAST = [
  "Okafor",
  "Marchetti",
  "Nair",
  "Demir",
  "Hoffmann",
  "Bell",
  "Tanaka",
  "Al-Sayed",
  "Novak",
  "Eze",
  "Larsson",
  "Reyes",
  "Haddad",
  "Liu",
  "Schmidt",
];
const ROLES = [
  "Staff Engineer",
  "Product Designer",
  "Eng Manager",
  "Frontend Engineer",
  "Data Scientist",
  "Backend Engineer",
  "DevOps Engineer",
  "QA Engineer",
];
const STATUSES = ["Active", "Paid", "Open", "Blocked", "Archived"];

/** Deterministic 50k-row generator (seeded, no Math.random). */
function makeBigList(n: number): BigPerson[] {
  const out: BigPerson[] = new Array<BigPerson>(n);
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < n; i++) {
    const f = FIRST[(rnd() * FIRST.length) | 0];
    const l = LAST[(rnd() * LAST.length) | 0];
    out[i] = {
      id: i + 1,
      name: `${f} ${l}`,
      email:
        `${f}.${l}`.toLowerCase().replace(/[^a-z.]/g, "") + i + "@northwind.io",
      role: ROLES[(rnd() * ROLES.length) | 0],
      status: STATUSES[(rnd() * STATUSES.length) | 0],
      budget: 40000 + ((rnd() * 180000) | 0),
    };
  }
  return out;
}

/** Children per parent in the `?tree=1` benchmark shape. */
const TREE_FANOUT = 10;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

const COLUMNS: ColumnDef<BigPerson>[] = [
  {
    key: "name",
    header: "Person",
    sortable: true,
    sortValue: (r) => r.name,
    Cell: PersonCell,
  },
  { key: "role", header: "Role", accessor: (r) => r.role },
  { key: "status", header: "Status", accessor: (r) => r.status },
  {
    key: "budget",
    header: "Budget",
    align: "end",
    sortable: true,
    sortValue: (r) => r.budget,
    accessor: (r) => money.format(r.budget),
  },
];

/** Scale-demo knobs from the URL — `?rows=N` (default 50,000), `?virtualize=0`
 *  to turn windowing OFF, `?all=1` to load the whole list up front, `?cols=N`
 *  to pad the table out to N columns, `?tier=server` to answer from a paged
 *  server instead of memory, `?edit=1` to make the cells editable, and
 *  `?patch=N` to apply N row patches after mount, `?rowHeight=1` for a
 *  variable-height virtualizer. They drive the benchmark suite
 *  (`scripts/bench.mjs`); every default is the demo a visitor sees. */
function scaleParams(): {
  total: number;
  virtual: boolean;
  virtualCols: boolean;
  all: boolean;
  cols: number;
  server: boolean;
  edit: boolean;
  patches: number;
  incremental: boolean;
  tree: boolean;
  variableHeight: boolean;
} {
  const DEFAULTS = {
    total: 50000,
    virtual: true,
    all: false,
    cols: 0,
    server: false,
    edit: false,
    patches: 0,
    incremental: false,
    virtualCols: false,
    tree: false,
    variableHeight: false,
  };
  if (typeof window === "undefined") return DEFAULTS;
  const p = new URLSearchParams(window.location.search);
  const int = (key: string) => {
    const value = Number(p.get(key));
    return Number.isInteger(value) && value > 0 ? value : 0;
  };
  return {
    total: int("rows") || DEFAULTS.total,
    virtual: p.get("virtualize") !== "0",
    virtualCols: p.get("virtualizeColumns") === "1",
    all: p.get("all") === "1",
    cols: int("cols"),
    server: p.get("tier") === "server",
    edit: p.get("edit") === "1",
    patches: int("patch"),
    incremental: p.get("incremental") === "1",
    tree: p.get("tree") === "1",
    variableHeight: p.get("rowHeight") === "1",
  };
}

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
  if (cols <= base.length) return base;
  const columnsIn = base;
  const extra: ColumnDef<BigPerson>[] = [];
  for (let i = columnsIn.length; i < cols; i++) {
    extra.push({
      key: `synthetic${i}`,
      header: `Col ${i}`,
      accessor: (r) => (i % 2 === 0 ? r.role : r.status),
      width: 120,
    });
  }
  return [...columnsIn, ...extra];
}

/**
 * One row of a dataset too big to hold, synthesized on demand.
 *
 * A million-row server tier cannot be faked by generating a million rows in the
 * tab — that measures the generator, not the table. Rows are derived from their
 * index instead, so a page costs a page and the reported total is honest.
 */
function serverRow(index: number): BigPerson {
  let seed = (index + 1) * 2654435761;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const f = FIRST[(rnd() * FIRST.length) | 0];
  const l = LAST[(rnd() * LAST.length) | 0];
  return {
    id: index + 1,
    name: `${f} ${l}`,
    email: `${f}.${l}`.toLowerCase() + index + "@northwind.io",
    role: ROLES[(rnd() * ROLES.length) | 0],
    status: STATUSES[(rnd() * STATUSES.length) | 0],
    budget: 40000 + ((rnd() * 180000) | 0),
  };
}

/**
 * The server-backed arm: the table asks for a slice, this answers it, and the
 * browser never holds the set. `total` is what the pager and the ARIA counts
 * report, so 1,000,000 means 1,000,000.
 */
function variableRowHeight(row: BigPerson): number {
  return 40 + (row.id % 4) * 12;
}

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
  const [page, setPage] = useState({ from: 0, limit: 500 });
  const rows = useMemo(
    () =>
      Array.from({ length: Math.min(page.limit, total - page.from) }, (_, i) =>
        serverRow(page.from + i)
      ),
    [page, total]
  );
  const source = useServerData<BigPerson>({
    rows,
    total,
    urlKey: "scale",
    urlSync: false,
    paginationMode: "infinite",
    defaults: { limit: 500 },
    onQueryChange: (query) => {
      setPage({ from: (query.page - 1) * query.limit, limit: query.limit });
    },
  });
  const Table = kitTable<BigPerson>(kit);
  const navHeight = useNavHeight();
  return (
    <KitProvider kit={kit} dark={dark}>
      <Table
        source={source}
        columns={columns}
        rowKey={(r) => String(r.id)}
        labels={getLabels("en")}
        urlSync={false}
        searchPlaceholder={`Filter ${total.toLocaleString("en-US")} rows…`}
        virtualize={virtual}
        virtualizeColumns={virtualCols}
        estimateRowSize={48}
        rowHeight={variableHeight ? variableRowHeight : undefined}
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
    for (let id = 1; id <= total; id += TREE_FANOUT) roots.push(String(id));
    return {
      getParentId: (row: BigPerson) =>
        (row.id - 1) % TREE_FANOUT === 0
          ? undefined
          : String(row.id - ((row.id - 1) % TREE_FANOUT)),
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
    defaults: { limit: all ? total : 500 },
  });
  const Table = kitTable<BigPerson>(kit);
  const navHeight = useNavHeight();
  return (
    <KitProvider kit={kit} dark={dark}>
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
          source={source}
          columns={columns}
          rowKey={(r) => String(r.id)}
          labels={getLabels("en")}
          urlSync={false}
          searchPlaceholder={`Filter ${total.toLocaleString("en-US")} rows…`}
          virtualize={virtual}
          virtualizeColumns={virtualCols}
          getParentId={treeShape?.getParentId}
          expandedIds={treeShape?.expandedIds}
          estimateRowSize={48}
          rowHeight={variableHeight ? variableRowHeight : undefined}
          classNames={kitClassNames(kit)}
          // Page-scroll window mode with a pinned header: the page itself
          // scrolls the 50k rows while the header sticks under the app nav.
          stickyHeader
          stickyTop={navHeight}
          onCellEdit={
            edit
              ? (row, _key, nextValue) => {
                  setRows((current) =>
                    applyRowPatches(
                      current,
                      [
                        updateRow<BigPerson>(String(row.id), {
                          budget: Number(nextValue),
                        }),
                      ],
                      (r) => String(r.id)
                    )
                  );
                }
              : undefined
          }
        />
      </div>
    </KitProvider>
  );
}
