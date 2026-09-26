/**
 * A live table runtime, mapped onto an agent session.
 *
 * Every test drives a fake `TableRuntime` whose view the test can swap between
 * calls, so what is proven is the mapping itself: what a session is told the
 * table is, where each call lands, and which revision it is stamped with.
 */
import {
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
  revisionToken,
} from "@adapttable/core";
import type { TableRuntime, TableRuntimeView } from "@adapttable/core/binding";
import { describe, expect, it, type Mock, vi } from "vitest";

import { openTransaction, recordDecision } from "./approvalTransaction";
import {
  alwaysAllowFor,
  bindLiveSession,
  capabilityKind,
  createRevisionCounter,
  exclusionKey,
  perItemRefusal,
  readerResolver,
  sampledColumns,
  type TableAgentRuntimeOptions,
  viewInputsFromRuntime,
  viewRevisionStamp,
} from "./tableAgentRuntime";
import type {
  AgentCapabilityDefinition,
  AgentCellEdit,
  AgentObservation,
  AgentSession,
  ApprovalResult,
  ApprovalSubject,
  ExecuteResult,
  ResolvedRow,
  RowReadQuery,
  RowRef,
  RowWindow,
} from "./types";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly salary: number;
}

const ADA: Row = { id: "1", name: "Ada", team: "Core", salary: 170 };
const GRACE: Row = { id: "2", name: "Grace", team: "Data", salary: 150 };
const KATHERINE: Row = {
  id: "3",
  name: "Katherine",
  team: "Core",
  salary: 160,
};
const ROWS: readonly Row[] = [ADA, GRACE, KATHERINE];

/** One field of a row, or `undefined` for a row that is not a record. */
function fieldOf(row: unknown, key: string): unknown {
  return typeof row === "object" && row !== null
    ? Reflect.get(row, key)
    : undefined;
}

/** A string or number as text, and nothing else. */
function textOf(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return typeof value === "number" ? String(value) : undefined;
}

function idOf(row: unknown): string {
  return textOf(fieldOf(row, "id")) ?? textOf(row) ?? "";
}

function nameOf(row: unknown): string {
  return textOf(fieldOf(row, "name")) ?? idOf(row);
}

/** A runtime over one fixed view. */
function runtimeOver(view: TableRuntimeView | undefined): TableRuntime {
  return {
    rowAt: () => undefined,
    labels: () => undefined,
    view: () => view,
    featureIds: () => [],
  };
}

const noop = (): void => undefined;

/** A view with rows and identity, and nothing else wired. */
function bareView(patch: Partial<TableRuntimeView> = {}): TableRuntimeView {
  return { rows: ROWS, getRowId: idOf, rowLabel: nameOf, ...patch };
}

type Query = NonNullable<TableRuntimeView["query"]>;

function wiredQuery(patch: Partial<Query> = {}): Query {
  return {
    page: 1,
    limit: 10,
    search: "",
    setPage: vi.fn(),
    setLimit: vi.fn(),
    setSearch: vi.fn(),
    setSort: vi.fn(),
    ...patch,
  };
}

/** Every channel a runtime view can publish, each a spy. */
function wiredView(patch: Partial<TableRuntimeView> = {}): TableRuntimeView {
  return bareView({
    visibleRows: [GRACE, ADA, KATHERINE],
    query: wiredQuery({
      page: 2,
      limit: 25,
      total: 60,
      defaultLimit: 10,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      extra: { team: ["Core"] },
      setExtras: vi.fn(),
      clearExtras: vi.fn(),
    }),
    sourceCapabilities: {
      fullDataset: false,
      grouping: "client",
      selectAcrossPages: false,
      exportScope: "page",
      totalCount: "exact",
    },
    groupingState: {
      groupBy: "team",
      aggregateOverrides: {},
      columnLabel: (key) => key,
      columns: [
        {
          key: "salary",
          aggregatable: { operations: ["sum", "avg"] },
          formatValue: (row) => `$${textOf(fieldOf(row, "salary")) ?? ""}k`,
        },
        { key: "name" },
      ],
      setGroupBy: vi.fn(),
      setAggregateOverrides: vi.fn(),
    },
    filterDefs: [
      {
        key: "team",
        type: "multiSelect",
        label: "Team",
        options: [
          { value: "Core", label: "Core" },
          { value: "Data", label: "Data" },
        ],
      },
    ],
    pinning: {
      columns: { name: "start" },
      rows: { top: ["1"], bottom: [] },
      setColumnPin: vi.fn(),
      setRowPin: vi.fn(),
    },
    columnLayout: {
      keys: ["name", "salary", "notes"],
      hidden: ["salary"],
      setHidden: vi.fn(),
      move: vi.fn(),
      setOrder: vi.fn(),
    },
    selection: { selectedIds: new Set(["2"]), replace: vi.fn() },
    editing: { onCellEdit: vi.fn(), stageCell: vi.fn() },
    ...patch,
  });
}

/** A local engine over the fixture rows, published as a neutral table. */
function neutralTable(
  columns: Parameters<typeof createTableEngine<Row>>[0]["columns"] = [
    { key: "name", header: "Name", sortable: true },
    { key: "team", header: "Team" },
    { key: "salary", header: "Salary" },
  ]
) {
  const engine = createTableEngine<Row>({
    data: [...ROWS],
    columns,
    rowKey: (row) => row.id,
  });
  const table = createNeutralTable(engine, "staff") as NeutralTable<unknown>;
  return { engine, table };
}

/** Calls one `apply` member the way a host capability handler would. */
const APPLY_PROBE: AgentCapabilityDefinition = {
  key: "test.apply",
  summary: "Call one apply member.",
  kind: "view",
  guide: {
    guide: "Calls the named apply member with the given arguments.",
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: async (context, args) => {
    const { member, input } = args as { member: string; input: unknown[] };
    const fn: unknown = Reflect.get(context.apply, member);
    if (typeof fn !== "function") return { wired: false };
    const value: unknown = await fn(...input);
    return { wired: true, value };
  },
};

/** Returns the observation the session read for this call. */
const OBSERVE_PROBE: AgentCapabilityDefinition = {
  key: "test.observe",
  summary: "Return the observation.",
  kind: "read",
  guide: {
    guide: "Returns the observation the session read.",
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: (context) => ({ observation: context.observe() }),
};

/** Reads a symbol-keyed member of `apply`. */
const SYMBOL_PROBE: AgentCapabilityDefinition = {
  key: "test.symbol",
  summary: "Read a symbol member.",
  kind: "read",
  guide: {
    guide: "Reads a symbol-keyed member of apply.",
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: (context) => ({
    absent: Reflect.get(context.apply, Symbol.iterator) === undefined,
  }),
};

/** Reports progress twice, then settles. */
const PROGRESS_PROBE: AgentCapabilityDefinition = {
  key: "test.progress",
  summary: "Report progress.",
  kind: "read",
  guide: {
    guide: "Reports progress, then settles.",
    input: { type: "object" },
    output: { type: "object" },
  },
  isEnabled: () => true,
  execute: (context) => {
    context.reportProgress?.({ done: 1, total: 2, label: "rows" });
    context.reportProgress?.({ done: 2, total: 2, label: "rows" });
    return { done: true };
  },
};

const PROBES = [APPLY_PROBE, OBSERVE_PROBE, SYMBOL_PROBE, PROGRESS_PROBE];

interface Bound {
  readonly session: AgentSession;
  readonly options: { current: TableAgentRuntimeOptions };
  readonly runtime: { current: TableRuntime };
  readonly setView: (next: TableRuntimeView | undefined) => void;
  readonly flush: Mock<(run: () => void) => void>;
  readonly flushAdmission: Mock<() => void>;
  readonly waitForChrome: Mock<
    (subject: ApprovalSubject, signal?: AbortSignal) => Promise<ApprovalResult>
  >;
  readonly reportProgress: Mock<(report: unknown) => void>;
}

/** A session over a runtime whose view the test controls. */
function bind(
  options: TableAgentRuntimeOptions,
  view: TableRuntimeView | undefined,
  featureIds: readonly string[] = []
): Bound {
  let current = view;
  const runtime: TableRuntime = {
    rowAt: () => undefined,
    labels: () => undefined,
    view: () => current,
    featureIds: () => featureIds,
  };
  const flush = vi.fn((run: () => void) => {
    run();
  });
  const flushAdmission = vi.fn<() => void>();
  const waitForChrome = vi.fn(
    (_subject: ApprovalSubject, _signal?: AbortSignal) =>
      Promise.resolve<ApprovalResult>(true)
  );
  const reportProgress = vi.fn<(report: unknown) => void>();
  const optionsRef = { current: options };
  const runtimeRef = { current: runtime };
  const session = bindLiveSession({
    options: optionsRef,
    runtime: runtimeRef,
    revisions: createRevisionCounter(),
    flushAdmission: { current: flushAdmission },
    waitForChrome: { current: waitForChrome },
    reportProgress: { current: reportProgress },
    flush,
  });
  return {
    session,
    options: optionsRef,
    runtime: runtimeRef,
    setView: (next) => {
      current = next;
    },
    flush,
    flushAdmission,
    waitForChrome,
    reportProgress,
  };
}

/** `bind`, with the probes registered beside whatever the test supplies. */
function probed(
  options: Omit<TableAgentRuntimeOptions, "tableId"> & {
    readonly tableId?: string;
  },
  view: TableRuntimeView | undefined,
  featureIds: readonly string[] = []
): Bound {
  return bind(
    {
      tableId: "staff",
      ...options,
      capabilities: [...(options.capabilities ?? []), ...PROBES],
    },
    view,
    featureIds
  );
}

let calls = 0;

function run(
  session: AgentSession,
  key: string,
  args: unknown
): Promise<ExecuteResult> {
  calls += 1;
  return session.execute(
    key,
    args,
    session.manifest().viewRevision,
    `${key}-${String(calls)}`
  );
}

async function callApply(
  session: AgentSession,
  member: string,
  ...input: unknown[]
): Promise<ExecuteResult> {
  return run(session, "test.apply", { member, input });
}

async function observed(session: AgentSession): Promise<AgentObservation> {
  const result = await run(session, "test.observe", {});
  if (!result.ok) throw new Error(result.error?.message);
  return (result.result as { observation: AgentObservation }).observation;
}

function valueOf(result: ExecuteResult): unknown {
  if (!result.ok) throw new Error(result.error?.message);
  return (result.result as { value?: unknown }).value;
}

function keysOf(session: AgentSession): readonly string[] {
  return session.catalog().map((entry) => entry.key);
}

describe("viewRevisionStamp", () => {
  it("stamps a neutral table by its revisions", () => {
    const { table } = neutralTable();

    expect(viewRevisionStamp(bareView({ neutralTable: table }))).toBe(
      revisionToken(table.revisions)
    );
  });

  it("stamps the same view the same way, and a moved view differently", () => {
    const first = viewRevisionStamp(wiredView());

    expect(viewRevisionStamp(wiredView())).toBe(first);
    expect(
      viewRevisionStamp(wiredView({ rows: [{ ...ADA, name: "Ada L." }] }))
    ).not.toBe(first);
    expect(
      viewRevisionStamp(
        wiredView({ query: wiredQuery({ page: 3, limit: 25 }) })
      )
    ).not.toBe(first);
    expect(
      viewRevisionStamp(
        wiredView({ columnLayout: { keys: ["salary", "name"], hidden: [] } })
      )
    ).not.toBe(first);
  });

  it("writes a BigInt, a shared value and a row that contains itself", () => {
    const shared = { tag: "shared" };
    const cyclic: Record<string, unknown> = { id: "c", size: 12n };
    cyclic.self = cyclic;
    cyclic.left = shared;
    cyclic.right = shared;

    const stamp = viewRevisionStamp(bareView({ rows: [cyclic] }));

    expect(stamp).toContain('"12n"');
    expect(stamp.match(/"tag":"shared"/g)).toHaveLength(2);
    expect(stamp).not.toContain('"self"');
  });

  it("stamps no view at all with the defaults", () => {
    expect(JSON.parse(viewRevisionStamp(undefined))).toEqual({
      ids: [],
      payloads: [],
      page: 1,
      limit: 10,
      search: "",
    });
  });
});

describe("createRevisionCounter", () => {
  it("starts at 1 and moves by one when the stamp changes", () => {
    const counter = createRevisionCounter();

    expect(counter.current()).toBe(1);
    expect(counter.bumpFromStamp("a")).toBe(1);
    expect(counter.bumpFromStamp("a")).toBe(1);
    expect(counter.bumpFromStamp("b")).toBe(2);
    expect(counter.bumpFrom({ data: 1, view: 0, schema: 0, policy: 0 })).toBe(
      3
    );
    expect(counter.bumpFrom({ data: 1, view: 0, schema: 0, policy: 0 })).toBe(
      3
    );
    expect(counter.current()).toBe(3);
  });
});

describe("the observation a session reads", () => {
  it("describes a runtime view from its wiring and the host's columns", async () => {
    const { session } = probed(
      {
        columns: {
          name: {
            label: "Name",
            type: "string",
            sortable: true,
            writable: true,
          },
          salary: {},
        },
        writePolicy: "deny",
        approval: { policy: "destructive", presentation: "modal" },
        commit: "immediate",
        readMax: 5,
      },
      wiredView(),
      ["filters", "grouping"]
    );

    const observation = await observed(session);

    expect(observation).toMatchObject({
      tableId: "staff",
      viewRevision: 1,
      featureIds: ["filters", "grouping"],
      writePolicy: "deny",
      approval: "destructive",
      presentation: "modal",
      commit: "immediate",
      hasPagination: true,
      hasSearch: true,
      hasSort: true,
      hasFilters: true,
      hasEdit: true,
      hasColumnPinning: true,
      hasRowPinning: true,
      hasColumnHide: true,
      hasColumnOrder: true,
      hasSelection: true,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      groupBy: "team",
      filters: { team: ["Core"] },
      pinnedColumns: { name: "start" },
      pinnedRows: { top: ["1"], bottom: [] },
      hiddenColumns: ["salary"],
      columnOrder: ["name", "salary", "notes"],
      readMax: 5,
      rowAddressScope: "visible",
      source: { totalCount: "exact" },
    });
    expect(observation.columns).toEqual([
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: true,
        sortable: true,
        visible: true,
      },
      {
        id: "salary",
        label: "salary",
        type: "unknown",
        readable: true,
        writable: false,
        sortable: false,
        visible: false,
      },
      {
        id: "notes",
        label: "notes",
        type: "unknown",
        readable: true,
        writable: false,
        sortable: false,
        visible: true,
      },
    ]);
    expect(observation.pagination).toMatchObject({
      page: 2,
      pageSize: 25,
      totalRows: 60,
      totalPages: 3,
      hasNext: true,
      canJump: true,
    });
    expect(observation.pagination?.pageSizeOptions).toEqual(
      expect.arrayContaining([10, 25])
    );
    expect(observation.availableFilters?.map((filter) => filter.key)).toEqual([
      "team",
    ]);
    expect(observation.aggregations).toBeDefined();
  });

  it("leaves out what a bare runtime view cannot answer for", async () => {
    const { session } = probed({}, bareView());

    const observation = await observed(session);

    expect(observation).toMatchObject({
      search: "",
      writePolicy: "allow",
      approval: "writes",
      commit: "stage",
      readMax: 50,
      hasPagination: false,
      hasFilters: false,
      hasEdit: false,
      source: { fullDataset: false, totalCount: "loaded" },
    });
    expect(observation.sortBy).toBeUndefined();
    expect(observation.groupBy).toBeUndefined();
    expect(observation.pinnedColumns).toBeUndefined();
    expect(observation.filters).toBeUndefined();
    expect(observation.columns).toHaveLength(0);
    expect(observation.pagination).toMatchObject({
      page: 1,
      pageSize: 10,
      hasNext: false,
      canJump: false,
    });
    expect(observation.pagination?.totalRows).toBeUndefined();
  });

  it("describes a table with no runtime view yet", async () => {
    const { session } = probed(
      { columns: { name: { label: "Name" } } },
      undefined
    );

    const observation = await observed(session);

    expect(observation.viewRevision).toBe(1);
    expect(observation.columns.map((column) => column.id)).toEqual(["name"]);
    expect(observation.pagination?.hasNext).toBeUndefined();
  });

  it("keeps an uncounted total unknown and orders columns without a layout order", async () => {
    const { session } = probed(
      { columns: { name: {}, team: {} } },
      bareView({
        query: wiredQuery({ total: 60 }),
        columnLayout: { keys: [], hidden: ["team"] },
      })
    );

    const observation = await observed(session);

    expect(observation.pagination?.totalRows).toBeUndefined();
    expect(
      observation.columns.map((column) => [column.id, column.visible])
    ).toEqual([
      ["name", true],
      ["team", false],
    ]);
  });

  it("publishes no total when a counting source has not been told one", async () => {
    const { session } = probed(
      {},
      bareView({
        query: wiredQuery(),
        sourceCapabilities: {
          fullDataset: false,
          grouping: false,
          selectAcrossPages: false,
          exportScope: "page",
          totalCount: "exact",
        },
      })
    );

    const observation = await observed(session);

    expect(observation.pagination?.totalRows).toBeUndefined();
    expect(observation.pagination?.pageSizeOptions).toContain(10);
  });

  it("overlays the runtime view on a neutral table", async () => {
    const { table } = neutralTable();
    const { session } = probed(
      { columns: { salary: { readable: false } } },
      wiredView({ neutralTable: table })
    );

    const observation = await observed(session);

    expect(
      observation.columns.map((column) => [column.id, column.visible])
    ).toEqual([
      ["name", true],
      ["salary", false],
      ["notes", true],
    ]);
    expect(
      observation.columns.find((column) => column.id === "salary")?.readable
    ).toBe(false);
    expect(observation).toMatchObject({
      page: 2,
      limit: 25,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      groupBy: "team",
      filters: { team: ["Core"] },
      pinnedColumns: { name: "start" },
      hiddenColumns: ["salary"],
    });
    expect(observation.pagination?.pageSizeOptions).toEqual(
      expect.arrayContaining([10, 25])
    );
    expect(observation.availableFilters?.map((filter) => filter.key)).toEqual([
      "team",
    ]);
  });

  it("reads a neutral table on its own when the view publishes no query", async () => {
    const { table } = neutralTable();
    const { session } = probed({}, bareView({ neutralTable: table }));

    const observation = await observed(session);

    expect(observation.page).toBe(1);
    expect(observation.columns.map((column) => column.id)).toEqual([
      "name",
      "team",
      "salary",
    ]);
    expect(observation.pagination?.pageSizeOptions).toContain(10);
  });

  it("uses a host-supplied observation verbatim", () => {
    const custom: AgentObservation = {
      tableId: "custom",
      viewRevision: 7,
      featureIds: [],
      columns: [],
      source: {
        fullDataset: false,
        grouping: false,
        selectAcrossPages: false,
        exportScope: "page",
        totalCount: "loaded",
      },
      writePolicy: "allow",
      hasPagination: true,
      hasSearch: false,
      hasSort: false,
      hasFilters: false,
      hasExport: false,
      hasEdit: false,
      hasReorder: false,
      page: 1,
      limit: 10,
      search: "",
      pageMax: 10,
      rowAddressScope: "visible",
    };
    const { session } = bind(
      { tableId: "ignored", observe: () => custom, apply: { setPage: noop } },
      wiredView()
    );

    expect(session.manifest().tableId).toBe("custom");
    expect(session.manifest().viewRevision).toBe(7);
    expect(keysOf(session)).toContain("view.setPage");
  });
});

describe("the revision a session stamps", () => {
  it("moves when a runtime view changes and holds while it does not", () => {
    const { session, setView } = bind({ tableId: "staff" }, wiredView());

    expect(session.manifest().viewRevision).toBe(1);
    expect(session.manifest().viewRevision).toBe(1);
    setView(wiredView({ rows: [ADA] }));
    expect(session.manifest().viewRevision).toBe(2);
  });

  it("follows a neutral table's own revisions", () => {
    const { engine, table } = neutralTable();
    const { session } = bind(
      { tableId: "staff" },
      bareView({ neutralTable: table })
    );

    expect(session.manifest().viewRevision).toBe(1);
    engine.invalidate(["data"], { data: [ADA] });
    expect(session.manifest().viewRevision).toBe(2);
  });

  it("holds at the first revision while there is no view", () => {
    const { session } = bind({ tableId: "staff" }, undefined);

    expect(session.manifest().viewRevision).toBe(1);
    expect(session.manifest().viewRevision).toBe(1);
  });
});

describe("view operations through the runtime's own setters", () => {
  it("runs the built-in view capabilities on the live query and commits each one", async () => {
    const view = wiredView();
    const query = view.query!;
    const { session, flush } = probed(
      { columns: { name: { sortable: true } } },
      view
    );

    const search = await run(session, "view.setSearch", { query: "grace" });
    const sort = await run(session, "view.setSort", {
      key: "name",
      dir: "asc",
    });
    const page = await run(session, "view.setPage", { page: 1, limit: 10 });

    expect([search.ok, sort.ok, page.ok]).toEqual([true, true, true]);
    expect(query.setSearch).toHaveBeenCalledWith("grace");
    expect(query.setSort).toHaveBeenCalledWith("name", "asc");
    expect(query.setLimit).toHaveBeenCalledWith(10);
    expect(query.setPage).toHaveBeenCalledWith(1);
    expect(flush).toHaveBeenCalledTimes(4);
  });

  it("commits the binding's pending state before every call", async () => {
    const order: string[] = [];
    const setSearch = vi.fn(() => order.push("setSearch"));
    const { session, flushAdmission } = probed(
      {},
      bareView({ query: wiredQuery({ setSearch }) })
    );
    flushAdmission.mockImplementation(() => {
      order.push("flushAdmission");
    });

    await run(session, "view.setSearch", { query: "ada" });

    expect(order).toEqual(["flushAdmission", "setSearch"]);
  });

  it("refuses a query operation the runtime does not wire", async () => {
    const { session } = probed({}, bareView());

    for (const member of ["setPage", "setLimit", "setSearch", "setSort"]) {
      const result = await callApply(session, member, 1);
      expect(result.ok).toBe(false);
      expect(result.error?.message).toBe(`${member} is not wired`);
    }
  });

  it("groups, pins, hides and orders through the live setters", async () => {
    const view = wiredView();
    const { session, flush } = probed({}, view);

    await callApply(session, "setGroupBy", "name");
    await callApply(session, "pinColumn", "name", "end");
    await callApply(session, "hideColumn", "name", true);
    await callApply(session, "moveColumn", "name", 2);
    await callApply(session, "setColumnOrder", ["salary", "name"]);
    await callApply(session, "pinRow", "2", "bottom");
    await callApply(session, "setAggregations", { restoreDefaults: true });
    await callApply(session, "setSelection", ["1", "3"]);

    expect(view.groupingState?.setGroupBy).toHaveBeenCalledWith("name");
    expect(view.pinning?.setColumnPin).toHaveBeenCalledWith("name", "end");
    expect(view.columnLayout?.setHidden).toHaveBeenCalledWith("name", true);
    expect(view.columnLayout?.move).toHaveBeenCalledWith("name", 2);
    expect(view.columnLayout?.setOrder).toHaveBeenCalledWith([
      "salary",
      "name",
    ]);
    expect(view.pinning?.setRowPin).toHaveBeenCalledWith("2", "bottom");
    expect(view.groupingState?.setAggregateOverrides).toHaveBeenCalledWith({});
    expect(view.selection?.replace).toHaveBeenCalledWith(["1", "3"]);
    expect(flush).toHaveBeenCalledTimes(8);
  });

  it("refuses a layout operation the runtime does not wire", async () => {
    const { session } = probed(
      {},
      bareView({
        pinning: { columns: {} },
        columnLayout: { keys: ["name"], hidden: [] },
      })
    );
    const refusals: Record<string, unknown[]> = {
      setGroupBy: ["name"],
      pinColumn: ["name", "start"],
      hideColumn: ["name", true],
      moveColumn: ["name", 0],
      setColumnOrder: [["name"]],
      pinRow: ["1", "top"],
      setAggregations: [{ restoreDefaults: true }],
    };

    for (const [member, input] of Object.entries(refusals)) {
      const result = await callApply(session, member, ...input);
      expect(result.ok).toBe(false);
      expect(result.error?.message).toBe(`${member} is not wired`);
    }
  });

  it("leaves the selection alone when the runtime has none", async () => {
    const { session } = probed({}, bareView());

    const result = await callApply(session, "setSelection", ["1"]);

    expect(result.ok).toBe(true);
  });

  it("lets the host's own callback win, uncommitted by the mapping", async () => {
    const view = wiredView();
    const setSearch = vi.fn();
    const { session, flush } = probed({ apply: { setSearch } }, view);

    await run(session, "view.setSearch", { query: "ada" });

    expect(setSearch).toHaveBeenCalledWith("ada");
    expect(view.query?.setSearch).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });

  it("reads a symbol member and an unwired member as absent", async () => {
    const { session } = probed({}, bareView());

    const symbol = await run(session, "test.symbol", {});
    const exported = await callApply(session, "runExport", "csv");

    expect(symbol.result).toEqual({ absent: true });
    expect(exported.result).toEqual({ wired: false });
  });

  it("answers nothing for a host member explicitly left undefined", async () => {
    const { session } = probed({ apply: { applyView: undefined } }, bareView());

    const result = await callApply(session, "applyView", "saved");

    expect(result.result).toEqual({ wired: true });
  });
});

describe("filters through the live query", () => {
  it("replaces, clears and refuses a filter model", async () => {
    const view = wiredView();
    const query = view.query!;
    const { session, flush } = probed({}, view, ["filters"]);

    const replaced = await run(session, "view.setFilters", {
      filters: { team: ["Data"] },
    });
    await callApply(session, "setFilters", null);
    await callApply(session, "setFilters", {});
    const text = await callApply(session, "setFilters", "team");
    const list = await callApply(session, "setFilters", ["team"]);

    expect(replaced.ok).toBe(true);
    expect(query.setExtras).toHaveBeenCalledWith({ team: ["Data"] });
    expect(query.clearExtras).toHaveBeenCalledTimes(2);
    expect(text.error?.message).toBe("setFilters requires a filter object");
    expect(list.error?.message).toBe("setFilters requires a filter object");
    expect(flush).toHaveBeenCalled();
  });

  it("clears through a query that can only clear", async () => {
    const clearExtras = vi.fn();
    const { session } = probed(
      {},
      bareView({ query: wiredQuery({ clearExtras }) })
    );

    await callApply(session, "setFilters", undefined);

    expect(clearExtras).toHaveBeenCalledTimes(1);
  });

  it("reports a replacement a set-only query cannot clear", async () => {
    const setExtras = vi.fn();
    const { session } = probed(
      {},
      bareView({ query: wiredQuery({ setExtras }) })
    );

    const cleared = await callApply(session, "setFilters", null);
    const emptied = await callApply(session, "setFilters", {});

    expect(cleared.ok).toBe(true);
    expect(emptied.ok).toBe(true);
    expect(setExtras).not.toHaveBeenCalled();
  });

  it("refuses filters the runtime cannot take", async () => {
    const withQuery = probed({}, bareView({ query: wiredQuery() }));
    const withoutQuery = probed({}, bareView());

    const first = await callApply(withQuery.session, "setFilters", {});
    const second = await callApply(withoutQuery.session, "setFilters", {});

    expect(first.error?.message).toBe("setFilters is not wired");
    expect(second.error?.message).toBe("setFilters is not wired");
  });

  it("hands filters to the host's own callback", async () => {
    const setFilters = vi.fn();
    const view = wiredView();
    const { session } = probed({ apply: { setFilters } }, view);

    await callApply(session, "setFilters", { team: ["Core"] });

    expect(setFilters).toHaveBeenCalledWith({ team: ["Core"] });
    expect(view.query?.setExtras).not.toHaveBeenCalled();
  });
});

describe("rows read and resolved from the runtime view", () => {
  it("reads the rendered order, redacting what the agent may not read", async () => {
    const { session } = probed(
      { columns: { name: {}, salary: { readable: false } }, readMax: 2 },
      wiredView()
    );

    const window = valueOf(
      await callApply(session, "readRows", { offset: 0, limit: 5 })
    ) as RowWindow;

    expect(window).toEqual({
      rows: [
        { rowKey: "2", cells: { name: "Grace" } },
        { rowKey: "1", cells: { name: "Ada" } },
      ],
      offset: 0,
      limit: 2,
      redacted: ["salary"],
    });
  });

  it("reads the page order and only the columns asked for", async () => {
    const { session } = probed(
      { columns: { name: {}, team: {} } },
      wiredView()
    );

    const window = valueOf(
      await callApply(session, "readRows", {
        offset: 1,
        limit: 1,
        scope: "page",
        columns: ["team"],
      })
    ) as RowWindow;

    expect(window.rows).toEqual([{ rowKey: "2", cells: { team: "Data" } }]);
  });

  it("reads the rows themselves when the view renders no other order", async () => {
    const { session } = probed(
      { columns: { name: {} } },
      bareView({ rows: [ADA, "plain"] })
    );

    const window = valueOf(
      await callApply(session, "readRows", { offset: 0, limit: -1 })
    ) as RowWindow;
    const both = valueOf(
      await callApply(session, "readRows", { offset: 0, limit: 5 })
    ) as RowWindow;

    expect(window.limit).toBe(0);
    expect(window.rows).toHaveLength(0);
    expect(both.rows).toEqual([
      { rowKey: "1", cells: { name: "Ada" } },
      { rowKey: "plain", cells: { name: undefined } },
    ]);
  });

  it("reads nothing before there is a view", async () => {
    const { session } = probed({}, undefined);

    const visible = valueOf(
      await callApply(session, "readRows", { offset: 0, limit: 5 })
    ) as RowWindow;
    const page = valueOf(
      await callApply(session, "readRows", {
        offset: 0,
        limit: 5,
        scope: "page",
      })
    ) as RowWindow;

    expect(visible.rows).toHaveLength(0);
    expect(page.rows).toHaveLength(0);
  });

  it("reads and resolves through a neutral table", async () => {
    const { table } = neutralTable();
    const { session } = probed({}, bareView({ neutralTable: table }));

    const window = valueOf(
      await callApply(session, "readRows", { offset: 0, limit: 1 })
    ) as RowWindow;
    const resolved = valueOf(
      await callApply(session, "resolveRow", { position: 2, scope: "page" })
    ) as ResolvedRow;

    expect(window.rows[0]?.cells.name).toBe("Ada");
    expect(resolved).toEqual({ rowKey: "2", scope: "page", position: 2 });
  });

  it("resolves a key or a position in the rendered order", async () => {
    const { session } = probed({}, wiredView());

    const byKey = valueOf(
      await callApply(session, "resolveRow", { rowKey: "3" })
    ) as ResolvedRow;
    const byPageKey = valueOf(
      await callApply(session, "resolveRow", { rowKey: "3", scope: "page" })
    ) as ResolvedRow;
    const visible = valueOf(
      await callApply(session, "resolveRow", {
        position: 1,
        scope: "visible",
      })
    ) as ResolvedRow;
    const page = valueOf(
      await callApply(session, "resolveRow", { position: 1, scope: "page" })
    ) as ResolvedRow;
    const missing = await callApply(session, "resolveRow", {
      position: 9,
      scope: "visible",
    });

    expect(byKey).toEqual({ rowKey: "3", scope: "visible" });
    expect(byPageKey).toEqual({ rowKey: "3", scope: "page" });
    expect(visible).toEqual({ rowKey: "2", scope: "visible", position: 1 });
    expect(page).toEqual({ rowKey: "1", scope: "page", position: 1 });
    expect(missing.error?.message).toBe("no row at 1-based position 9");
  });

  it("resolves against the rows themselves, and against no view at all", async () => {
    const bare = probed({}, bareView());
    const empty = probed({}, undefined);

    const first = valueOf(
      await callApply(bare.session, "resolveRow", {
        position: 1,
        scope: "visible",
      })
    ) as ResolvedRow;
    const none = await callApply(empty.session, "resolveRow", {
      position: 1,
      scope: "page",
    });
    const noneVisible = await callApply(empty.session, "resolveRow", {
      position: 1,
      scope: "visible",
    });

    expect(first.rowKey).toBe("1");
    expect(none.error?.message).toBe("no row at 1-based position 1");
    expect(noneVisible.error?.message).toBe("no row at 1-based position 1");
  });

  it("serves the built-in read and resolve capabilities", async () => {
    const { session } = probed({ columns: { name: {} } }, wiredView());

    const read = await run(session, "rows.read", { offset: 0, limit: 1 });
    const revision = session.manifest().viewRevision;
    const resolved = await session.execute(
      "rows.resolve",
      { position: 1, expectedRevision: revision },
      revision,
      "resolve-built-in"
    );

    expect(read.ok).toBe(true);
    expect(resolved.ok).toBe(true);
  });
});

describe("cell writes through the runtime's editing channels", () => {
  it("writes each edit through the live cell editor, uncommitted by the mapping", async () => {
    const view = wiredView();
    const { session, flush } = probed(
      {
        columns: { name: { type: "string", writable: true } },
        approval: "never",
        commit: "immediate",
      },
      view
    );

    const result = await run(session, "edit.cells", {
      edits: [{ rowKey: "1", column: "name", value: "Ada L." }],
    });

    expect(result.ok).toBe(true);
    expect(view.editing?.onCellEdit).toHaveBeenCalledWith(
      ADA,
      "name",
      "Ada L."
    );
    expect(flush).not.toHaveBeenCalled();
  });

  it("stages each edit as text through the live staging channel", async () => {
    const view = wiredView();
    const { session } = probed({}, view);

    const staged: AgentCellEdit[] = [
      { rowKey: "2", column: "salary", value: 175 },
      { rowKey: "3", column: "name", value: "Kay" },
    ];
    await callApply(session, "stageCells", staged);

    expect(view.editing?.stageCell).toHaveBeenNthCalledWith(
      1,
      GRACE,
      "2",
      "salary",
      "175"
    );
    expect(view.editing?.stageCell).toHaveBeenNthCalledWith(
      2,
      KATHERINE,
      "3",
      "name",
      "Kay"
    );
  });

  it("refuses an edit to a row the view does not hold", async () => {
    const { session } = probed({}, wiredView());
    const edits = [{ rowKey: "9", column: "name", value: "x" }];

    const edited = await callApply(session, "editCells", edits);
    const staged = await callApply(session, "stageCells", edits);

    expect(edited.error?.message).toBe('row "9" is not in the current view');
    expect(staged.error?.message).toBe('row "9" is not in the current view');
  });

  it("refuses an edit the runtime has no channel for", async () => {
    const { session } = probed({}, bareView());
    const edits = [{ rowKey: "1", column: "name", value: "x" }];

    const edited = await callApply(session, "editCells", edits);
    const staged = await callApply(session, "stageCells", edits);

    expect(edited.error?.message).toBe("editCells is not wired");
    expect(staged.error?.message).toBe("stageCells is not wired");
  });

  it("finds rows by key in a neutral table, and none without a view", async () => {
    const { table } = neutralTable();
    const onCellEdit = vi.fn();
    const neutral = probed(
      {},
      bareView({ neutralTable: table, editing: { onCellEdit } })
    );
    const empty = probed({}, undefined);
    const edits = [{ rowKey: "2", column: "name", value: "G" }];

    await callApply(neutral.session, "editCells", edits);
    const refused = await callApply(empty.session, "editCells", edits);

    expect(onCellEdit).toHaveBeenCalledWith(GRACE, "name", "G");
    expect(refused.error?.message).toBe("editCells is not wired");
  });
});

/** A host whose callbacks live on a prototype, which a spread drops. */
class PrototypeHost {
  readonly seen: string[] = [];

  readRows(query: RowReadQuery): RowWindow {
    this.seen.push("readRows");
    return { rows: [], offset: query.offset, limit: 0, redacted: [] };
  }

  resolveRow(ref: RowRef): ResolvedRow {
    this.seen.push("resolveRow");
    return { rowKey: "rowKey" in ref ? ref.rowKey : "host", scope: "visible" };
  }

  editCells(edits: readonly AgentCellEdit[]): unknown {
    this.seen.push(`editCells:${String(edits.length)}`);
    return { saved: edits.length };
  }

  stageCells(edits: readonly AgentCellEdit[]): unknown {
    this.seen.push(`stageCells:${String(edits.length)}`);
    return { staged: edits.length };
  }

  setSelection(ids: readonly string[] | undefined): void {
    this.seen.push(`setSelection:${ids?.join(",") ?? ""}`);
  }

  setFilters(filters: unknown): void {
    this.seen.push(`setFilters:${JSON.stringify(filters)}`);
  }
}

describe("a host whose callbacks a spread cannot copy", () => {
  it("still reaches the host for rows, edits, staging, selection and filters", async () => {
    const host = new PrototypeHost();
    const view = wiredView();
    const { session, flush } = probed({ apply: host }, view);
    const edits = [{ rowKey: "1", column: "name", value: "x" }];

    await callApply(session, "readRows", { offset: 0, limit: 1 });
    const resolved = valueOf(
      await callApply(session, "resolveRow", { position: 1, scope: "visible" })
    );
    await callApply(session, "editCells", edits);
    await callApply(session, "stageCells", edits);
    await callApply(session, "setSelection", ["2"]);
    await callApply(session, "setFilters", { team: ["Core"] });

    expect(resolved).toEqual({ rowKey: "host", scope: "visible" });
    expect(host.seen).toEqual([
      "readRows",
      "resolveRow",
      "editCells:1",
      "stageCells:1",
      "setSelection:2",
      'setFilters:{"team":["Core"]}',
    ]);
    expect(view.editing?.onCellEdit).not.toHaveBeenCalled();
    expect(view.selection?.replace).not.toHaveBeenCalled();
    expect(view.query?.setExtras).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });
});

describe("approvals", () => {
  const writable: Omit<TableAgentRuntimeOptions, "tableId"> = {
    columns: { name: { type: "string", writable: true } },
    approval: "writes",
    commit: "immediate",
  };

  it("asks the table's own approval surface when the host set no onApprove", async () => {
    const view = wiredView();
    const { session, waitForChrome } = probed(writable, view);

    const result = await run(session, "edit.cells", {
      edits: [{ rowKey: "1", column: "name", value: "Ada L." }],
    });

    expect(result.ok).toBe(true);
    expect(waitForChrome).toHaveBeenCalledTimes(1);
    expect(waitForChrome.mock.calls[0]?.[0].kind).toBe("rows");
    expect(view.editing?.onCellEdit).toHaveBeenCalled();
  });

  it("asks the host instead when it set onApprove", async () => {
    const onApprove = vi.fn(() => Promise.resolve<ApprovalResult>(false));
    const view = wiredView();
    const { session, waitForChrome } = probed({ ...writable, onApprove }, view);

    await run(session, "edit.cells", {
      edits: [{ rowKey: "1", column: "name", value: "Ada L." }],
    });

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(waitForChrome).not.toHaveBeenCalled();
    expect(view.editing?.onCellEdit).not.toHaveBeenCalled();
  });

  it("applies a built-in capability's own approval override", async () => {
    const view = wiredView();
    const { session, waitForChrome } = probed(
      {
        ...writable,
        approval: "never",
        capabilityApproval: {
          "edit.cells": { approval: { policy: "required" } },
        },
      },
      view
    );

    const result = await run(session, "edit.cells", {
      edits: [{ rowKey: "2", column: "name", value: "Grace H." }],
    });

    expect(result.ok).toBe(true);
    expect(waitForChrome).toHaveBeenCalledTimes(1);
    expect(view.editing?.onCellEdit).toHaveBeenCalledWith(
      GRACE,
      "name",
      "Grace H."
    );
  });
});

describe("the capabilities a session offers", () => {
  it("offers only the built-ins the runtime wires when the host adds none", () => {
    const { session } = bind({ tableId: "staff" }, bareView());

    expect(keysOf(session)).not.toContain("view.setPage");
    expect(keysOf(session)).toContain("columns.describe");
  });

  it("drops what the host excludes", () => {
    const { session } = bind(
      { tableId: "staff", excludeCapabilities: ["view.setSearch"] },
      wiredView()
    );

    expect(keysOf(session)).not.toContain("view.setSearch");
    expect(keysOf(session)).toContain("view.setSort");
    expect(session.describe("view.setSort").key).toBe("view.setSort");
  });

  it("runs the table's row and bulk actions against the live rows and selection", async () => {
    const open = vi.fn();
    const archive = vi.fn();
    const actions = {
      row: [{ key: "open", label: "Open", onClick: open }],
      bulk: [{ key: "archive", label: "Archive", onClick: archive }],
    };
    const { session, setView } = bind(
      { tableId: "staff", approval: "never", commit: "immediate" },
      wiredView({ actions })
    );

    const opened = await run(session, "rowAction.open", { rowKey: "3" });
    const missing = await run(session, "rowAction.open", { rowKey: "9" });
    const archived = await run(session, "bulkAction.archive", {
      rowKeys: ["2"],
    });
    setView(bareView({ actions }));
    const unselected = await run(session, "bulkAction.archive", {
      rowKeys: ["2"],
    });
    setView(undefined);
    const gone = await run(session, "rowAction.open", { rowKey: "3" });

    expect(opened.ok).toBe(true);
    expect(open).toHaveBeenCalledExactlyOnceWith(KATHERINE);
    expect(missing.ok).toBe(false);
    expect(archived.ok).toBe(true);
    expect(archive.mock.calls[0]?.[0]).toEqual(["2"]);
    expect(unselected.ok).toBe(false);
    expect(gone.ok).toBe(false);
  });

  it("delivers a capability's progress to whatever is listening now", async () => {
    const { session, reportProgress } = probed({}, bareView());
    const listener = vi.fn();
    reportProgress.mockImplementation(listener);

    await run(session, "test.progress", {});

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      done: 1,
      total: 2,
      capability: "test.progress",
    });
    expect(listener).toHaveBeenLastCalledWith(null);
  });
});

describe("sampledColumns", () => {
  it("names the readable columns whose author asked for live values", () => {
    const { table } = neutralTable([
      { key: "name", header: "Name" },
      { key: "team", header: "Team", ai: { sample: true } },
      { key: "salary", header: "Salary", ai: { sample: true } },
    ]);
    const { session } = bind(
      { tableId: "staff", columns: { salary: { readable: false } } },
      bareView({ neutralTable: table })
    );

    expect(sampledColumns(session)).toEqual(["team"]);
  });
});

describe("viewInputsFromRuntime", () => {
  it("carries everything the reader has done to the view", () => {
    const inputs = viewInputsFromRuntime(
      runtimeOver(wiredView()),
      { tableId: "staff" },
      { team: ["Core", "Data"] }
    );

    expect(inputs.filters?.map((filter) => filter.key)).toEqual(["team"]);
    expect(inputs.aggregations).toBeDefined();
    expect(inputs.samples).toEqual({ team: ["Core", "Data"] });
    expect(inputs.view).toEqual({
      page: 2,
      limit: 25,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      groupBy: "team",
      filters: { team: ["Core"] },
      pinnedColumns: { name: "start" },
      pinnedRows: { top: ["1"], bottom: [] },
      hiddenColumns: ["salary"],
      columnOrder: ["name", "salary", "notes"],
    });
  });

  it("leaves out what the reader has not touched", () => {
    const empty = viewInputsFromRuntime(
      runtimeOver(undefined),
      { tableId: "staff" },
      {}
    );
    const hidden = viewInputsFromRuntime(
      runtimeOver(
        bareView({
          filterDefs: [{ key: "internal", type: "text", ai: false }],
          query: wiredQuery(),
        })
      ),
      { tableId: "staff" },
      {}
    );

    expect(empty).toEqual({ view: {} });
    expect(hidden.filters).toBeUndefined();
    expect(hidden.view).toEqual({ page: 1, limit: 10, search: "" });
  });
});

describe("approval helpers", () => {
  function transaction() {
    return openTransaction(
      1,
      {
        proposals: [
          { rowKey: "1", column: "name", after: "A" },
          { rowKey: "2", column: "name", after: "B" },
        ],
        perItem: true,
        resolve: noop,
      },
      "widget"
    );
  }

  it("refuses every undecided row, with the reader's reason when given", () => {
    const open = transaction();
    const decided = recordDecision(open, 1, 0, true);

    expect(perItemRefusal(open, undefined)).toEqual({ approved: [] });
    expect(perItemRefusal(decided ?? open, "not today")).toEqual({
      approved: [0],
      reason: "not today",
    });
  });

  it("keys an exclusion list regardless of its order", () => {
    expect(exclusionKey(undefined)).toBe("");
    expect(exclusionKey(["view.setSort", "edit.cells"])).toBe(
      "edit.cells|view.setSort"
    );
    expect(exclusionKey(["edit.cells", "view.setSort"])).toBe(
      exclusionKey(["view.setSort", "edit.cells"])
    );
  });

  it("reads what a capability does from the live catalog", () => {
    const write: AgentCapabilityDefinition = {
      ...APPLY_PROBE,
      key: "test.write",
      kind: "write",
    };
    const { session } = bind(
      { tableId: "staff", capabilities: [write] },
      bareView()
    );

    expect(capabilityKind(session, "test.write")).toBe("write");
    expect(capabilityKind(session, "test.missing")).toBeUndefined();
    expect(capabilityKind(session, undefined)).toBeUndefined();
    expect(capabilityKind(undefined, "test.write")).toBeUndefined();
  });

  it("drops an always-allow a capability's own approval forbids", () => {
    const strict: AgentCapabilityDefinition = {
      ...APPLY_PROBE,
      key: "test.strict",
      ai: { approval: { policy: "required" } },
    };
    const shared = { alwaysAllow: ["test.strict", "test.loose"] };

    expect(alwaysAllowFor(undefined, undefined, undefined)).toEqual([]);
    expect(alwaysAllowFor(shared, undefined, undefined)).toEqual([
      "test.strict",
      "test.loose",
    ]);
    expect(alwaysAllowFor(shared, [strict], "test.strict")).toEqual([]);
    expect(alwaysAllowFor(shared, [strict], "test.loose")).toEqual([
      "test.strict",
      "test.loose",
    ]);
    expect(alwaysAllowFor(shared, undefined, "test.loose")).toEqual([
      "test.strict",
      "test.loose",
    ]);
  });
});

describe("readerResolver", () => {
  it("answers from the reader's own rows and columns", () => {
    const resolve = readerResolver(runtimeOver(wiredView()), {
      name: { label: "Full name" },
      salary: { readable: false },
    });

    expect(resolve.rowLabel("1")).toBe("Ada");
    expect(resolve.rowLabel("9")).toBeUndefined();
    expect(resolve.cellValue("2", "team")).toBe("Data");
    expect(resolve.cellValue("9", "team")).toBeUndefined();
    expect(resolve.cellText?.("1", "salary", 175)).toBe("$175k");
    expect(resolve.cellText?.("1", "name", "Ada L.")).toBeUndefined();
    expect(resolve.cellText?.("9", "salary", 175)).toBeUndefined();
    expect(resolve.cellText?.("1", "team", "Data")).toBeUndefined();
    expect(resolve.readable("salary")).toBe(false);
    expect(resolve.readable("name")).toBe(true);
    expect(resolve.columnLabel("name")).toBe("Full name");
    expect(resolve.columnLabel("team")).toBeUndefined();
  });

  it("reads every column as readable when the host restricts none", () => {
    const resolve = readerResolver(runtimeOver(bareView()), undefined);

    expect(resolve.readable("salary")).toBe(true);
    expect(resolve.columnLabel("salary")).toBeUndefined();
    expect(resolve.cellText?.("1", "salary", 1)).toBeUndefined();
  });

  it("reads nothing from a row that is not a record", () => {
    const resolve = readerResolver(
      runtimeOver(bareView({ rows: ["plain"] })),
      undefined
    );

    expect(resolve.rowLabel("plain")).toBe("plain");
    expect(resolve.cellValue("plain", "name")).toBeUndefined();
  });

  it("finds rows in a neutral table, and none without a view", () => {
    const { table } = neutralTable();
    const neutral = readerResolver(
      runtimeOver(bareView({ neutralTable: table })),
      undefined
    );
    const empty = readerResolver(runtimeOver(undefined), undefined);

    expect(neutral.rowLabel("3")).toBe("Katherine");
    expect(neutral.cellValue("3", "salary")).toBe(160);
    expect(empty.rowLabel("1")).toBeUndefined();
    expect(empty.cellValue("1", "name")).toBeUndefined();
  });
});
