/** Exports preserve selected data, column scope and current source capabilities. */
import {
  defaultLabels,
  type ExportCsvOptions,
  sourceCapabilities,
  type TableSource,
} from "@adapttable/core";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { injectFrontendData } from "../source/frontendData";
import { type ExportContext, injectExportHandler } from "./exportHandler";

interface City {
  id: string;
  name: string;
  country: string;
}
const CITIES: City[] = [
  { id: "1", name: "Dubai", country: "UAE" },
  { id: "2", name: "Amman", country: "Jordan" },
  { id: "3", name: "Cairo", country: "Egypt" },
  { id: "4", name: "Doha", country: "Qatar" },
];
const COLUMNS = [
  { key: "name", header: "Name", accessor: (row: City) => row.name },
  { key: "country", header: "Country", accessor: (row: City) => row.country },
];

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:export",
    revokeObjectURL: () => undefined,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined
  );
});
afterEach(() => vi.unstubAllGlobals());

function mount(options: ExportCsvOptions<City>, page = 1) {
  const result = TestBed.runInInjectionContext(() => {
    const source = injectFrontendData<City>({
      data: CITIES,
      columns: COLUMNS,
      defaults: { limit: 2, page },
      urlSync: false,
    });
    const current = signal<TableSource<City>>(source());
    const context = signal<ExportContext<City>>({
      getRowId: (row) => row.id,
      allColumns: COLUMNS,
    });
    const files: string[] = [];
    const state = injectExportHandler({
      exportCsv: {
        ...options,
        onAfterExport: ({ csv }) => {
          files.push(csv.replace(/^\uFEFF/, "").trim());
        },
      },
      source: current,
      columns: signal(COLUMNS.slice(0, 1)),
      labels: signal({
        ...defaultLabels,
        noticeExportAllPage: "Only a page is available",
      }),
      context,
    });
    return { current, context, files, state, source };
  });
  TestBed.tick();
  result.current.set(result.source());
  expect(result.current().rows.map((row) => row.id)).toEqual(
    page === 1 ? ["1", "2"] : ["3", "4"]
  );
  return result;
}

async function download(state: ReturnType<typeof mount>) {
  const before = state.files.length;
  state.state().onExportCsv!();
  await vi.waitFor(() => expect(state.files).toHaveLength(before + 1));
  return state.files.at(-1)!;
}

describe("export context", () => {
  it("exports only checked rows and reads selection again on each click", async () => {
    const result = mount({ scope: "selected" });
    result.context.update((context) => ({
      ...context,
      selectedIds: new Set(["2"]),
    }));
    expect(await download(result)).toBe("Name\r\nAmman");
    result.context.update((context) => ({
      ...context,
      selectedIds: new Set(["1"]),
    }));
    expect(await download(result)).toBe("Name\r\nDubai");
  });

  it("includes hidden columns only when the caller asks for all columns", async () => {
    const result = mount({ columns: "all" });
    expect(await download(result)).toBe(
      "Name,Country\r\nDubai,UAE\r\nAmman,Jordan"
    );
  });

  it("uses absolute range addresses relative to the current page", async () => {
    const result = mount({ scope: "range" }, 2);
    result.context.update((context) => ({
      ...context,
      firstRowIndex: 2,
      range: { anchor: { row: 3, col: 0 }, head: { row: 3, col: 0 } },
    }));
    expect(await download(result)).toBe("Name\r\nDoha");
  });

  it("disables unsupported full export, including an already captured start callback", async () => {
    const result = mount({ scope: "all" });
    const start = result.state().onExportCsv!;
    expect(result.state().exportDisabled).toBe(false);
    result.current.update((source) => ({
      ...source,
      allFilteredRows: undefined,
      capabilities: {
        ...sourceCapabilities(source),
        fullDataset: false,
        exportScope: "page",
      },
    }));
    expect(result.state().exportDisabled).toBe(true);
    expect(result.state().exportDisabledReason).toBe(
      "Only a page is available"
    );
    start();
    await Promise.resolve();
    expect(result.files).toEqual([]);
    expect(result.state().exportStatus).toBe("idle");
  });
  it("honours a page-only declaration even when full rows happen to be present", () => {
    const result = mount({ scope: "all" });
    result.current.update((source) => ({
      ...source,
      capabilities: {
        ...sourceCapabilities(source),
        fullDataset: false,
        exportScope: "page",
      },
    }));
    expect(result.current().allFilteredRows).toEqual(CITIES);
    expect(result.state().exportDisabled).toBe(true);
    result.state().onExportCsv!();
    expect(result.files).toEqual([]);
    expect(result.state().exportStatus).toBe("idle");
  });

  it("allows a host-built full export independently of source capabilities", async () => {
    const onExportAll = vi.fn(() => ({
      url: "https://example.com/cities.csv",
    }));
    const result = mount({ scope: "all", onExportAll });
    result.current.update((source) => ({
      ...source,
      allFilteredRows: undefined,
      capabilities: {
        ...sourceCapabilities(source),
        fullDataset: false,
        exportScope: "page",
      },
    }));
    expect(result.state().exportDisabled).toBe(false);
    result.state().onExportCsv!();
    await vi.waitFor(() => expect(result.state().exportStatus).toBe("done"));
    expect(onExportAll).toHaveBeenCalledWith(
      expect.objectContaining({ columns: expect.any(Array) }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.state().exportProgressState?.downloadUrl).toBe(
      "https://example.com/cities.csv"
    );
    expect(result.files).toEqual([]);
  });

  it("allows the opted-in fetch route to write every fetched row", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(CITIES));
    const result = mount({
      scope: "all",
      fetchAll: { fetchPage, pageSize: 5 },
    });
    result.current.update((source) => ({
      ...source,
      allFilteredRows: undefined,
      capabilities: {
        ...sourceCapabilities(source),
        fullDataset: false,
        exportScope: "page",
      },
    }));
    expect(result.state().exportDisabled).toBe(false);
    expect(await download(result)).toBe(
      "Name\r\nDubai\r\nAmman\r\nCairo\r\nDoha"
    );
    expect(fetchPage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ page: 1, limit: 5 })
    );
  });

  it("passes spans and scoped summaries to the export model", async () => {
    const result = mount({});
    result.context.update((context) => ({
      ...context,
      getCellSpan: ({ rowIndex }) =>
        rowIndex === 0 ? { rowSpan: 2 } : undefined,
      summaryRow: (rows) => ({ name: `Count ${String(rows.length)}` }),
    }));
    expect(await download(result)).toBe("Name\r\nDubai\r\n\r\nCount 2");
  });
  it("drops summary renderers and symbols instead of serializing them", async () => {
    const result = mount({ columns: "all" });
    result.context.update((context) => ({
      ...context,
      summaryRow: () => ({
        name: () => "renderer",
        country: Symbol("not a file value"),
      }),
    }));
    expect(await download(result)).toBe(
      "Name,Country\r\nDubai,UAE\r\nAmman,Jordan"
    );
  });
});
