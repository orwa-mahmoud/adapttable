import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import type { TableSource } from "../source/TableSource";
import { buildTreeEntries, type TreeShape } from "../tree/treeRows";
import { treeExportExpandedIds } from "../tree/treeRuntime";
import { resetDevWarnings } from "../utils/devWarn";
import { csvWriter, type ExportWriter } from "./exportWriter";
import { pdfWriter } from "./pdf";
import {
  buildTableCsv,
  downloadTableCsv,
  type ExportContext,
  type ExportCsvOptions,
  type ExportQuery,
  type ExportRowScope,
  makeExportCsvHandler,
} from "./tableCsv";
import { xlsxWriter } from "./xlsx";

interface Row {
  id: string;
  parcels: number;
  parent?: string;
  children?: readonly Row[];
}

const a: Row = { id: "A", parcels: 3 };
const b: Row = { id: "B", parcels: 3 };
const c: Row = { id: "C", parcels: 3 };
const d: Row = { id: "D", parcels: 3 };
const e: Row = { id: "E", parcels: 3 };
const f: Row = { id: "F", parcels: 3 };
const r1: Row = { id: "R1", parcels: 6, children: [a, b] };
const r2: Row = { id: "R2", parcels: 6, children: [c, d] };
const r3: Row = { id: "R3", parcels: 6, children: [e, f] };
const roots = [r1, r2, r3];
const allIds = ["R1", "A", "B", "R2", "C", "D", "R3", "E", "F"];
const getRowId = (row: Row) => row.id;
const getChildren = (row: Row) => row.children;
const ids = (rows: readonly Row[]) => rows.map(getRowId);
const columns: ColumnMetadata<Row>[] = [
  { key: "id", header: "ID", exportValue: getRowId },
  { key: "parcels", header: "Parcels", exportValue: (row) => row.parcels },
];

function source<TRow>(
  rows: readonly TRow[],
  allFilteredRows?: readonly TRow[],
  patch: Partial<TableSource<TRow>> = {}
): TableSource<TRow> {
  return {
    rows,
    allFilteredRows,
    total: allFilteredRows?.length ?? rows.length,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
    error: null,
    paginationMode: "paged",
    page: 1,
    limit: 1,
    defaultLimit: 1,
    search: "",
    sortBy: undefined,
    sortDir: undefined,
    sortLevels: [],
    groupBy: undefined,
    extra: {},
    setPage: () => undefined,
    setLimit: () => undefined,
    setSort: () => undefined,
    setGroupBy: () => undefined,
    toggleSortLevel: () => undefined,
    setSearch: () => undefined,
    setExtra: () => undefined,
    setExtras: () => undefined,
    clearExtras: () => undefined,
    clearAll: () => undefined,
    ...patch,
  };
}

function tree(
  rows: readonly Row[],
  expandedIds: ReadonlySet<string> = new Set(),
  shape: TreeShape<Row> = { getChildren }
): NonNullable<ExportContext<Row>["tree"]> {
  const entries = buildTreeEntries({ rows, getRowId, expandedIds, ...shape });
  const allEntries = buildTreeEntries({
    rows,
    getRowId,
    expandedIds: treeExportExpandedIds(entries),
    ...shape,
  });
  return { entries, allEntries, ...shape };
}

function csvIds(csv: string): string[] {
  return csv
    .split("\r\n")
    .slice(1)
    .map((line) => line.split(",")[0] ?? "");
}

function csv(scope: ExportRowScope, context: ExportContext<Row>, rows = roots) {
  return buildTableCsv({ source: source([r1], rows), columns, scope, context });
}

describe("source-scoped tree exports", () => {
  it("exports the exact nested delivery child when its reader is supplied", () => {
    interface Delivery {
      id: string;
      name: string;
      owner: string;
      children?: readonly Delivery[];
    }
    const child: Delivery = {
      id: "ORD-1042",
      name: "Atelier North",
      owner: "Sam Rivera",
    };
    const root: Delivery = {
      id: "run:europe",
      name: "Europe · delivery run",
      owner: "",
      children: [child],
    };
    const key = (row: Delivery) => row.id;
    const children = (row: Delivery) => row.children;
    const entries = buildTreeEntries({
      rows: [root],
      getRowId: key,
      getChildren: children,
      expandedIds: new Set([root.id]),
    });
    expect(
      buildTableCsv({
        source: source([root], [root]),
        columns: [
          {
            key: "name",
            header: "Run / order",
            exportValue: (row) => row.name,
          },
          { key: "owner", header: "Owner", exportValue: (row) => row.owner },
        ],
        scope: "all",
        context: {
          getRowId: key,
          tree: { entries, allEntries: entries, getChildren: children },
        },
      })
    ).toBe(
      "Run / order,Owner\r\nEurope · delivery run,\r\nAtelier North,Sam Rivera"
    );
  });

  it("includes collapsed and off-page descendants in all without changing runtime inventories", () => {
    const current = tree([r1]);
    const before = structuredClone(current.entries);
    expect(csvIds(csv("all", { getRowId, tree: current }))).toEqual(allIds);
    expect(current.entries).toEqual(before);
    expect(current.entries.map((entry) => entry.key)).toEqual(["R1"]);
    expect(current.allEntries?.map((entry) => entry.key)).toEqual([
      "R1",
      "A",
      "B",
    ]);
  });

  it.each([false, true])(
    "uses the visible page when expanded is %s",
    (expanded) => {
      const current = tree([r1], new Set(expanded ? ["R1"] : []));
      expect(csvIds(csv("page", { getRowId, tree: current }))).toEqual(
        expanded ? ["R1", "A", "B"] : ["R1"]
      );
    }
  );

  it.each([false, true])(
    "keeps page metadata on source rows when expanded is %s",
    async (expanded) => {
      const rows = [r1];
      const current = tree(rows, new Set(expanded ? ["R1"] : []));
      const context = { getRowId, tree: current };
      const before =
        vi.fn<NonNullable<ExportCsvOptions<Row>["onBeforeExport"]>>();
      const after =
        vi.fn<NonNullable<ExportCsvOptions<Row>["onAfterExport"]>>();
      const request = vi.fn<NonNullable<ExportCsvOptions<Row>["request"]>>();
      downloadTableCsv({
        source: source(rows, roots),
        columns,
        scope: "page",
        context,
        onBeforeExport: before,
        onAfterExport: after,
      });
      const handler = makeExportCsvHandler(
        { scope: "page", request },
        source(rows, roots),
        columns,
        context
      );
      expect(handler).toBeDefined();
      await handler?.();
      expect(before.mock.lastCall?.[0].rows).toEqual(rows);
      expect(after.mock.lastCall?.[0].rows).toEqual(rows);
      expect(request.mock.lastCall?.[0].rows).toEqual(rows);
      expect(after.mock.lastCall?.[0].csv).toBe(
        expanded ? "ID,Parcels\r\nR1,6\r\nA,3\r\nB,3" : "ID,Parcels\r\nR1,6"
      );
    }
  );

  it("keeps filtered roots and their current pruned nested shape", () => {
    const filtered = { ...r2, children: [d] };
    expect(
      csvIds(csv("all", { getRowId, tree: tree(roots) }, [filtered]))
    ).toEqual(["R2", "D"]);
  });

  it("keeps parent-ID membership and treats a filtered orphan as a root", () => {
    const p: Row = { id: "P", parcels: 6 };
    const kept: Row = { id: "KEEP", parcels: 3, parent: "P" };
    const removed: Row = { id: "REJECT", parcels: 3, parent: "P" };
    const current = tree([p, kept, removed], new Set(), {
      getParentId: (row) => row.parent,
    });
    expect(csvIds(csv("all", { getRowId, tree: current }, [p, kept]))).toEqual([
      "P",
      "KEEP",
    ]);
    expect(csvIds(csv("all", { getRowId, tree: current }, [kept]))).toEqual([
      "KEEP",
    ]);
  });

  it.each([
    { selected: [], expectedIds: [] },
    { selected: ["unknown"], expectedIds: [] },
    { selected: ["E"], expectedIds: ["E"] },
    { selected: ["F", "R1", "E"], expectedIds: ["R1", "E", "F"] },
  ])(
    "selects exactly checked IDs $selected in tree order",
    ({ selected, expectedIds }) => {
      const selectedIds = new Set(selected);
      const exportedIds = csvIds(
        csv("selected", { getRowId, selectedIds, tree: tree([r1]) })
      );
      expect(exportedIds).toEqual(allIds.filter((id) => selectedIds.has(id)));
      expect(exportedIds).toEqual(expectedIds);
    }
  );

  it("does not use a stale hierarchy when allFilteredRows is empty", () => {
    expect(csv("all", { getRowId, tree: tree(roots) }, [])).toBe("ID,Parcels");
  });

  it("preserves conservative source membership for readerless callers", () => {
    const current = tree([r1]);
    const legacy = { entries: current.entries, allEntries: current.allEntries };
    expect(csvIds(csv("all", { getRowId, tree: legacy }, [r1]))).toEqual([
      "R1",
    ]);
  });

  it("keeps authored row readers unary across readerless rows", () => {
    const current = tree([r1, r2]);
    const argumentCounts: number[] = [];
    function rowId(row: Row): string {
      argumentCounts.push(arguments.length);
      return row.id;
    }
    const exportedRows: Row[] = [];
    let exportedCsv = "";
    downloadTableCsv({
      source: source([r1, r2], [r1, r2]),
      columns,
      scope: "all",
      context: {
        getRowId: rowId,
        tree: { entries: current.entries, allEntries: current.allEntries },
      },
      onAfterExport: (info) => {
        exportedRows.push(...info.rows);
        exportedCsv = info.csv;
      },
    });
    expect(exportedRows).toEqual([r1, r2]);
    expect(exportedCsv).toBe("ID,Parcels\r\nR1,6\r\nR2,6");
    expect(argumentCounts.length).toBeGreaterThan(0);
    expect(argumentCounts.every((count) => count === 1)).toBe(true);
  });

  it("keeps the entries-only behavior without a row identity reader", () => {
    expect(csvIds(csv("all", { tree: tree([r1]) }))).toEqual(["R1", "A", "B"]);
  });

  it("keeps the current-page fallback when selection is unavailable", () => {
    resetDevWarnings();
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      expect(csvIds(csv("selected", { getRowId, tree: tree([r1]) }))).toEqual([
        "R1",
      ]);
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining('scope "selected" needs')
      );
    } finally {
      warning.mockRestore();
      resetDevWarnings();
    }
  });

  it("uses only loaded roots in a direct all call without the full source", () => {
    resetDevWarnings();
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    try {
      expect(
        csvIds(
          buildTableCsv({
            source: source([r1]),
            columns,
            scope: "all",
            context: { getRowId, tree: tree([r1]) },
          })
        )
      ).toEqual(["R1", "A", "B"]);
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining('scope "all" needs')
      );
    } finally {
      warning.mockRestore();
      resetDevWarnings();
    }
  });

  it("bypasses tree readers for a range", () => {
    const read = vi.fn(() => {
      throw new Error("range must not traverse tree");
    });
    expect(
      csvIds(
        csv("range", {
          getRowId,
          tree: { entries: [], getChildren: read },
          range: { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } },
        })
      )
    ).toEqual(["R1"]);
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    ["csv", csvWriter],
    ["pdf", pdfWriter()],
    ["xlsx", xlsxWriter()],
  ] satisfies [string, ExportWriter][])(
    "gives %s and hooks identical data while summarizing raw roots",
    (_format, writer) => {
      const build = vi.fn(writer.build);
      const summaryRow = vi.fn((rows: readonly Row[]) => ({
        id: "TOTAL",
        parcels: rows.reduce((total, row) => total + row.parcels, 0),
      }));
      const before = vi.fn(() => ({
        filename: `dispatch.${writer.extension}`,
      }));
      const after = vi.fn();
      downloadTableCsv({
        source: source([r1], roots),
        columns,
        scope: "all",
        context: { getRowId, tree: tree([r1]), summaryRow },
        writer: { ...writer, build },
        onBeforeExport: before,
        onAfterExport: after,
      });
      const input = build.mock.calls[0]?.[0];
      expect(input?.table.rows.map((row) => row[0])).toEqual([
        ...allIds,
        "TOTAL",
      ]);
      expect(input?.table.rows.at(-1)?.[1]).toBe(18);
      expect(input?.table.rows.at(-1)?.[1]).not.toBe(36);
      expect(summaryRow).toHaveBeenCalledExactlyOnceWith(roots);
      expect(before).toHaveBeenCalledWith(
        expect.objectContaining({ rows: [r1, a, b, r2, c, d, r3, e, f] })
      );
      expect(after).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [r1, a, b, r2, c, d, r3, e, f],
          filename: `dispatch.${writer.extension}`,
        })
      );
      expect(input?.table.rowMeta?.map((row) => row.level)).toEqual([
        0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
      ]);
    }
  );

  it.each(["page", "selected"] satisfies ExportRowScope[])(
    "keeps %s summary source-shaped",
    (scope) => {
      const summaryRow = vi.fn(() => ({}));
      csv(scope, {
        getRowId,
        selectedIds: new Set(["E"]),
        tree: tree([r1], new Set(["R1"])),
        summaryRow,
      });
      expect(summaryRow).toHaveBeenCalledExactlyOnceWith(
        scope === "page" ? [r1] : []
      );
    }
  );

  it("cancels before summary, writer and after hook", () => {
    const summaryRow = vi.fn(() => ({}));
    const build = vi.fn(csvWriter.build);
    const after = vi.fn();
    downloadTableCsv({
      source: source([r1], roots),
      columns,
      scope: "all",
      context: { getRowId, tree: tree([r1]), summaryRow },
      writer: { ...csvWriter, build },
      onBeforeExport: () => false,
      onAfterExport: after,
    });
    expect(summaryRow).not.toHaveBeenCalled();
    expect(build).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it.each(["all", "page", "selected", "range"] satisfies ExportRowScope[])(
    "projects only public request fields for %s",
    async (scope) => {
      const request = vi.fn<NonNullable<ExportCsvOptions<Row>["request"]>>();
      const summaryRow = vi.fn(() => ({}));
      const before = vi.fn();
      const after = vi.fn();
      const handler = makeExportCsvHandler(
        { scope, request, onBeforeExport: before, onAfterExport: after },
        source([r1], roots),
        columns,
        {
          getRowId,
          tree: tree([r1], new Set(["R1"])),
          selectedIds: new Set(["E"]),
          summaryRow,
          range: { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } },
        }
      );
      expect(handler).toBeDefined();
      await handler?.();
      const payload = request.mock.calls[0]?.[0];
      if (!payload) throw new Error("The export request was not called");
      expect(
        Object.keys(payload).sort((left, right) => left.localeCompare(right))
      ).toEqual(["columns", "filename", "format", "query", "rows", "scope"]);
      const expectedIds: Record<ExportRowScope, readonly string[]> = {
        all: allIds,
        page: ["R1"],
        selected: ["E"],
        range: ["R1"],
      };
      expect(ids(payload.rows)).toEqual(expectedIds[scope]);
      expect(summaryRow).not.toHaveBeenCalled();
      expect(before).not.toHaveBeenCalled();
      expect(after).not.toHaveBeenCalled();
    }
  );

  it("keeps onExportAll ahead of every local route and reader", async () => {
    const onExportAll = vi.fn();
    const rejectLocal = vi.fn(() => {
      throw new Error("local route called");
    });
    const handler = makeExportCsvHandler(
      {
        scope: "all",
        onExportAll,
        request: rejectLocal,
        fetchAll: { fetchPage: rejectLocal },
        onBeforeExport: rejectLocal,
        onAfterExport: rejectLocal,
      },
      source([r1]),
      columns,
      {
        getRowId,
        tree: { entries: [], getChildren: rejectLocal },
        summaryRow: rejectLocal,
      }
    );
    const signal = new AbortController().signal;
    await handler?.({ signal });
    expect(onExportAll).toHaveBeenCalledExactlyOnceWith(
      expect.not.objectContaining({ rows: expect.anything() }),
      { signal }
    );
    expect(rejectLocal).not.toHaveBeenCalled();
  });

  it("rebuilds from fetched roots even with page-only capability and stale page chrome", async () => {
    const summaryRow = vi.fn((rows: readonly Row[]) => ({
      id: "TOTAL",
      parcels: rows.reduce((total, row) => total + row.parcels, 0),
    }));
    const after = vi.fn();
    const fetchPage = vi.fn((query: ExportQuery) => {
      if (query.page === undefined) {
        throw new Error("The fetchAll fixture requires a page number");
      }
      return Promise.resolve(roots.slice(query.page - 1, query.page));
    });
    const handler = makeExportCsvHandler(
      {
        scope: "all",
        fetchAll: { pageSize: 1, fetchPage },
        onAfterExport: after,
      },
      source([r1], undefined, {
        capabilities: {
          fullDataset: false,
          grouping: false,
          selectAcrossPages: false,
          exportScope: "page",
          totalCount: "exact",
        },
        total: 3,
      }),
      columns,
      { getRowId, tree: tree([r1]), summaryRow }
    );
    await handler?.();
    expect(fetchPage.mock.calls.map(([query]) => query.page)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(summaryRow).toHaveBeenCalledExactlyOnceWith(roots);
    expect(after).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [r1, a, b, r2, c, d, r3, e, f],
        csv: expect.stringContaining("TOTAL,18"),
      })
    );
  });
});
