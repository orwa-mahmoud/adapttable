/**
 * Which route an export takes, and what happens when the chosen one cannot
 * run.
 *
 * "All rows" is the case that matters. A server-backed table holds one page,
 * so an all-rows request is only real if the host supplied a way to get the
 * rest — a handler, a request endpoint, or a page fetcher. When none of them
 * is there, the control has to stay inert: quietly downloading the current
 * page instead would hand the user a file that says "all" and contains
 * twenty-five rows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnModel } from "../columnModel";
import type { TableSource } from "../source/TableSource";
import { resetDevWarnings } from "../utils/devWarn";
import { csvWriter } from "./exportWriter";
import {
  EXPORT_FETCH_ALL_MAX_ROWS,
  exportAllFallsBackToPage,
  type ExportQuery,
  fetchAllExportRows,
  makeExportCsvHandler,
  resolveExportCsv,
} from "./tableCsv";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];

const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
];

function source(patch: Partial<TableSource<Row>> = {}): TableSource<Row> {
  return {
    rows: [ROWS[0]!],
    allFilteredRows: undefined,
    total: 2,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
    error: null,
    paginationMode: "paged",
    page: 1,
    limit: 25,
    defaultLimit: 25,
    search: "ada",
    sortBy: "name",
    sortDir: "asc",
    groupBy: undefined,
    extra: {},
    setPage: () => undefined,
    setLimit: () => undefined,
    setSort: () => undefined,
    setGroupBy: () => undefined,
    sortLevels: [],
    toggleSortLevel: () => undefined,
    setSearch: () => undefined,
    setExtra: () => undefined,
    setExtras: () => undefined,
    clearExtras: () => undefined,
    clearAll: () => undefined,
    ...patch,
  };
}

describe("resolveExportCsv", () => {
  const writer = { ...csvWriter, extension: "tsv" };
  const host = { writers: [csvWriter, writer] } as never;

  it("is off when the prop says so", () => {
    expect(resolveExportCsv(false)).toBeNull();
    expect(resolveExportCsv(false, host)).toBeNull();
  });

  it("is off by default, and on when a feature registered a writer", () => {
    expect(resolveExportCsv(undefined)).toBeNull();
    expect(resolveExportCsv(undefined, host)?.writer).toBe(writer);
  });

  it("takes the last registered writer for a bare `true`", () => {
    expect(resolveExportCsv(true)).toEqual({});
    expect(resolveExportCsv(true, host)?.writer).toBe(writer);
  });

  it("lets the caller's own writer win over a registered one", () => {
    const own = { ...csvWriter, extension: "csv" };
    expect(resolveExportCsv({ writer: own }, host)?.writer).toBe(own);
    expect(resolveExportCsv({ scope: "all" }, host)?.writer).toBe(writer);
    expect(resolveExportCsv({ scope: "all" })?.writer).toBeUndefined();
  });
});

describe("fetchAllExportRows", () => {
  it("pages until a short page proves the end", async () => {
    const pages = [[ROWS[0]!, ROWS[1]!], [ROWS[0]!]];
    const fetchPage = vi.fn((query: { page: number; limit: number }) =>
      Promise.resolve(pages[query.page - 1] ?? [])
    );
    const rows = await fetchAllExportRows(source(), {
      fetchPage: fetchPage as never,
      pageSize: 2,
    });
    expect(rows).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls[0]?.[0]).toMatchObject({
      page: 1,
      limit: 2,
      search: "ada",
      sortBy: "name",
    });
  });

  it("stops at the cap and says it stopped short", async () => {
    const onCapped = vi.fn();
    const rows = await fetchAllExportRows(source(), {
      fetchPage: () => Promise.resolve([ROWS[0]!, ROWS[1]!]),
      pageSize: 2,
      maxRows: 3,
      onCapped,
    });
    expect(rows).toHaveLength(3);
    expect(onCapped).toHaveBeenCalledWith({ rows: 3, maxRows: 3 });
  });

  it("defaults its page size to the table's and its cap to the published one", async () => {
    const fetchPage = vi.fn((_query: ExportQuery) =>
      Promise.resolve([] as readonly Row[])
    );
    await fetchAllExportRows(source({ limit: 7 }), { fetchPage });
    expect(fetchPage.mock.calls[0]?.[0]).toMatchObject({ limit: 7 });
    expect(EXPORT_FETCH_ALL_MAX_ROWS).toBe(50_000);
  });
});

describe("exportAllFallsBackToPage", () => {
  it("is true only for an all-rows request with no route to run it", () => {
    expect(exportAllFallsBackToPage({ scope: "all" }, source())).toBe(true);
    expect(exportAllFallsBackToPage({ scope: "page" }, source())).toBe(false);
    expect(
      exportAllFallsBackToPage(
        { scope: "all" },
        source({ allFilteredRows: ROWS })
      )
    ).toBe(false);
  });
});

describe("makeExportCsvHandler", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("wires nothing when export is off", () => {
    expect(makeExportCsvHandler(false, source(), COLUMNS)).toBeUndefined();
  });

  it("hands an all-rows request to the host's own handler, query in hand", async () => {
    const onExportAll = vi.fn(() => undefined);
    const handler = makeExportCsvHandler(
      { scope: "all", onExportAll, filename: "people" },
      source(),
      COLUMNS
    );
    await handler?.();
    const call = onExportAll.mock.calls[0] as unknown as [
      Record<string, unknown>,
      { signal: AbortSignal },
    ];
    const query = call[0] as unknown as {
      columns: string[];
      filename: string;
      format: string;
      search: string;
    };
    expect(query).toMatchObject({
      columns: ["name"],
      filename: "people",
      format: "csv",
      search: "ada",
    });
    // A caller that passes no controls still gets a signal to abort with.
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("hands the whole export to a backend when one is declared", async () => {
    const request = vi.fn(() => undefined);
    const handler = makeExportCsvHandler(
      { scope: "all", request },
      source(),
      COLUMNS
    );
    await handler?.();
    expect(request).toHaveBeenCalledTimes(1);
    const payload = (
      request.mock.calls[0] as unknown as [Record<string, unknown>]
    )[0] as unknown as {
      scope: string;
      format: string;
      filename: string;
    };
    expect(payload.scope).toBe("all");
    expect(payload.format).toBe("csv");
    expect(payload.filename).toMatch(/\.csv$/);
  });

  it("fetches the rest of the rows before building an all-rows file", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(ROWS));
    const created: string[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      created.push(String((blob as Blob).size));
      return "blob:test";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const handler = makeExportCsvHandler(
      {
        scope: "all",
        fetchAll: { fetchPage: fetchPage, pageSize: 3 },
      },
      source(),
      COLUMNS
    );
    await handler?.();
    expect(fetchPage).toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });

  it("refuses to pass off the current page as every row", async () => {
    const warn = vi.spyOn(console, "warn");
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    const handler = makeExportCsvHandler({ scope: "all" }, source(), COLUMNS);
    expect(handler).toBeDefined();
    await handler?.();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("needs an executable full-export route")
    );
  });

  it("downloads the page itself for every ordinary scope", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const onAfterExport = vi.fn();
    const handler = makeExportCsvHandler(
      { scope: "page", onAfterExport },
      source(),
      COLUMNS
    );
    await handler?.();
    expect(onAfterExport).toHaveBeenCalledTimes(1);
  });
});
