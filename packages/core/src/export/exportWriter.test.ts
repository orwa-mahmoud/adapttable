/**
 * The writer seam: one export pipeline, more than one file format.
 *
 * What matters here is the division of labour. Scopes decide which rows and
 * columns leave the table; a writer decides what the bytes look like; neither
 * gets to influence the other. These check that the pipeline holds that line —
 * including that a format never has to reimplement `onBeforeExport`, the
 * filename, or the scope it was given.
 */
import type { ColumnModel } from "../columnModel";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TableSource } from "../source/TableSource";
import * as env from "../utils/env";
import {
  buildExportTable,
  csvWriter,
  downloadExportFile,
  type ExportWriter,
} from "./exportWriter";
import {
  downloadTableCsv,
  type ExportRequest,
  makeExportCsvHandler,
} from "./tableCsv";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Linus" },
];

const COLUMNS: ColumnModel<Row>[] = [
  { key: "name", header: "Name", exportValue: (row) => row.name },
];

function makeSource(): TableSource<Row> {
  return {
    rows: ROWS,
    allFilteredRows: ROWS,
    total: ROWS.length,
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
    search: "",
    sortBy: undefined,
    sortDir: undefined,
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
  };
}

/** A writer that records what it was handed, and names a format of its own. */
function spyWriter(): ExportWriter & { seen: { filename: string }[] } {
  const seen: { filename: string }[] = [];
  return {
    seen,
    extension: "tsv",
    build: ({ table, filename }) => {
      seen.push({ filename });
      const text = [
        table.keys.join("\t"),
        ...table.rows.map((row) => row.join("\t")),
      ].join("\n");
      return { parts: [text], mimeType: "text/tab-separated-values", text };
    },
  };
}

/** The resolved values a writer receives for the whole fixture. */
const TABLE = buildExportTable(ROWS, COLUMNS);

describe("csvWriter", () => {
  it("writes the same CSV the export always wrote", () => {
    const payload = csvWriter.build({ table: TABLE, filename: "export.csv" });
    expect(payload.text).toBe("Name\r\nAda\r\nLinus");
    expect(payload.mimeType).toBe("text/csv;charset=utf-8");
  });

  it("leads with a byte-order mark, which is what makes Excel read UTF-8", () => {
    const payload = csvWriter.build({ table: TABLE, filename: "export.csv" });
    expect(payload.parts[0]).toBe("\uFEFF");
  });

  it("still neutralises formulas, and still lets a caller turn that off", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", exportValue: () => "=CMD()" },
    ];
    const table = buildExportTable([ROWS[0]!], columns);
    const guarded = csvWriter.build({ table, filename: "export.csv" });
    const raw = csvWriter.build({
      table,
      filename: "export.csv",
      escapeFormulas: false,
    });
    expect(guarded.text).toContain("'=CMD()");
    expect(raw.text).not.toContain("'=CMD()");
  });

  it("exports a spanned value once and leaves covered cells empty", () => {
    const columns: ColumnModel<Row>[] = [
      { key: "name", header: "Name", exportValue: (row) => row.name },
      { key: "name2", header: "Also", exportValue: (row) => row.name },
    ];
    const table = buildExportTable(ROWS, columns, {
      getCellSpan: ({ column, rowIndex }) =>
        column.key === "name" && rowIndex === 0 ? { colSpan: 2 } : undefined,
    });
    expect(table.rows[0]).toEqual(["Ada", ""]);
    expect(table.rows[1]).toEqual(["Linus", "Linus"]);
  });

  it("keeps a Date from the row when nothing else answers", () => {
    const due = new Date("2026-08-15T00:00:00.000Z");
    const table = buildExportTable([{ due }], [{ key: "due", header: "Due" }]);
    expect(table.rows[0]?.[0]).toBe(due);
  });

  it("keeps a Date the accessor returned, not a string of it", () => {
    const due = new Date("2026-08-15T13:45:00.000Z");
    const table = buildExportTable(
      [{ due }],
      [
        {
          key: "when",
          header: "When",
          exportValue: (row: { due: Date }) => row.due,
        },
      ]
    );
    expect(table.rows[0]?.[0]).toBe(due);
  });

  it("sizes columns from a numeric or string width", () => {
    const table = buildExportTable(ROWS, [
      { key: "name", header: "Name", width: 160 },
      { key: "name", header: "Also", width: "80px" },
      { key: "name", header: "Bare" },
      { key: "name", header: "Tiny", width: 20 },
      { key: "name", header: "Huge", width: 400 },
      { key: "name", header: "Auto", width: "auto" },
    ]);
    expect(table.widths?.[0]).toBe(20);
    expect(table.widths?.[1]).toBe(10);
    expect(table.widths?.[2]).toBeUndefined();
    expect(table.widths?.[3]).toBe(8);
    expect(table.widths?.[4]).toBe(40);
    expect(table.widths?.[5]).toBeUndefined();
  });

  it("writes a grouped view and appends a grand total", () => {
    const table = buildExportTable(ROWS, COLUMNS, {
      view: [
        { role: "group", label: "Core", level: 0, labelKey: "name" },
        { role: "data", row: ROWS[0]!, level: 1 },
      ],
      summary: { name: "All" },
    });
    expect(table.rowMeta?.map((meta) => meta.role)).toEqual([
      "group",
      "data",
      "aggregate",
    ]);
    expect(table.rows[0]?.[0]).toBe("Core");
    expect(table.rows[2]?.[0]).toBe("All");
  });

  it("puts a group's own values on the header, not only the label", () => {
    const table = buildExportTable(ROWS, COLUMNS, {
      view: [
        {
          role: "group",
          label: "Core",
          level: 0,
          labelKey: "name",
          values: { name: "Core team" },
        },
      ],
    });
    expect(table.rows[0]).toEqual(["Core team"]);
    expect(table.rowMeta?.[0]).toEqual({ role: "group", level: 0 });
  });
});

describe("a custom writer in the export pipeline", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("names the file after the format when no filename was chosen", () => {
    let filename = "";
    downloadTableCsv({
      source: makeSource(),
      columns: COLUMNS,
      writer: spyWriter(),
      onAfterExport: (info) => {
        filename = info.filename;
      },
    });
    expect(filename).toBe("export.tsv");
  });

  it("builds from the scope it was given, not from the whole table", () => {
    const writer = spyWriter();
    let text = "";
    downloadTableCsv({
      source: makeSource(),
      columns: COLUMNS,
      scope: "selected",
      context: { selectedIds: new Set(["2"]), getRowId: (row) => row.id },
      writer,
      onAfterExport: (info) => {
        text = info.csv;
      },
    });
    expect(text).toBe("name\nLinus");
  });

  it("is handed the filename the before-hook chose, not the original", () => {
    // A writer that embeds a title would otherwise embed the wrong one.
    const writer = spyWriter();
    downloadTableCsv({
      source: makeSource(),
      columns: COLUMNS,
      writer,
      onBeforeExport: () => ({ filename: "renamed.tsv" }),
    });
    expect(writer.seen).toEqual([{ filename: "renamed.tsv" }]);
  });

  it("builds nothing at all when the before-hook cancels", () => {
    const writer = spyWriter();
    downloadTableCsv({
      source: makeSource(),
      columns: COLUMNS,
      writer,
      onBeforeExport: () => false,
    });
    expect(writer.seen).toHaveLength(0);
  });

  it("reports the built file to the after-hook alongside its text", () => {
    let mimeType = "";
    downloadTableCsv({
      source: makeSource(),
      columns: COLUMNS,
      writer: spyWriter(),
      onAfterExport: ({ file }) => {
        mimeType = file.mimeType;
      },
    });
    expect(mimeType).toBe("text/tab-separated-values");
  });
});

describe("a backend export request", () => {
  it("says which format the button would have produced", () => {
    // The filename alone is a guess, and a server that guesses wrong sends
    // the user a file their spreadsheet refuses to open.
    let seen: ExportRequest<Row> | undefined;
    makeExportCsvHandler(
      {
        writer: spyWriter(),
        request: (info) => {
          seen = info;
        },
      },
      makeSource(),
      COLUMNS
    )?.();
    expect(seen?.format).toBe("tsv");
    expect(seen?.filename).toBe("export.tsv");
  });

  it("defaults to csv when no writer was chosen", () => {
    let seen: ExportRequest<Row> | undefined;
    makeExportCsvHandler(
      {
        request: (info) => {
          seen = info;
        },
      },
      makeSource(),
      COLUMNS
    )?.();
    expect(seen?.format).toBe("csv");
  });
});

describe("downloadExportFile", () => {
  afterEach(() => vi.restoreAllMocks());

  it("hands a blob of the writer's own MIME type to the browser", () => {
    const url = "blob:test";
    const createObjectURL = vi.fn((_blob: Blob) => url);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadExportFile("people.tsv", {
      parts: ["a\tb"],
      mimeType: "text/tab-separated-values",
      text: "a\tb",
    });

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0]?.[0].type).toBe(
      "text/tab-separated-values"
    );
    // Revoked in the same turn: a URL left alive pins the file in memory for
    // the life of the document.
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
    vi.unstubAllGlobals();
  });

  it("does nothing without a browser, so a server render is safe", () => {
    const browser = vi.spyOn(env, "isBrowser").mockReturnValue(false);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadExportFile("people.tsv", {
      parts: ["a"],
      mimeType: "text/plain",
      text: "a",
    });
    expect(click).not.toHaveBeenCalled();
    browser.mockRestore();
    click.mockRestore();
  });
});
