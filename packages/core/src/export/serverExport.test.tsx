/**
 * Handing an export to the backend, and telling the user what happened.
 *
 * Past a certain size the browser is the wrong place to build the file, so the
 * button sends the user's current view somewhere that can. Three things must
 * hold: the table builds and downloads nothing itself, the same export cannot
 * be started twice by an impatient second click, and the outcome is announced —
 * a download is silent, and so is a failed one.
 */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TableSource } from "../source/TableSource";
import type { ColumnDef } from "../types";
import { resetDevWarnings } from "../utils/devWarn";
import { ExportAnnouncer } from "./ExportAnnouncer";
import {
  type ExportRequest,
  fetchAllExportRows,
  makeExportCsvHandler,
} from "./tableCsv";
import { useExportHandler } from "./useExportHandler";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];

function source(): TableSource<Row> {
  return {
    rows: ROWS,
    allFilteredRows: ROWS,
    total: 1,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
    error: null,
    paginationMode: "paged",
    page: 3,
    limit: 25,
    defaultLimit: 25,
    search: "ada",
    sortBy: "name",
    sortDir: "desc",
    groupBy: undefined,
    extra: { team: "Core" },
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

/** A server-tier source: one page in hand, no full set. */
function serverSource(over: Partial<TableSource<Row>> = {}): TableSource<Row> {
  return { ...source(), allFilteredRows: undefined, ...over };
}

describe('scope "all" over a server source', () => {
  it("asks the backend for the set, not for a page", () => {
    const request = vi.fn();
    const handler = makeExportCsvHandler(
      { scope: "all", request },
      serverSource(),
      COLUMNS
    );
    handler?.();
    const info = request.mock.calls[0]?.[0] as ExportRequest<Row>;
    // Everything that shapes the set travels; the window into it does not.
    expect(info.query).toMatchObject({
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      filters: { team: "Core" },
    });
    expect(info.query.page).toBeUndefined();
    expect(info.query.limit).toBeUndefined();
    expect(info.scope).toBe("all");
  });

  it("still sends the page window for a page-scoped export", () => {
    const request = vi.fn();
    makeExportCsvHandler(
      { scope: "page", request },
      serverSource(),
      COLUMNS
    )?.();
    const info = request.mock.calls[0]?.[0] as ExportRequest<Row>;
    expect(info.query.page).toBe(3);
    expect(info.query.limit).toBe(25);
  });

  it("keeps a this-page button when it cannot answer all", () => {
    // Neither `request` nor `fetchAll`, and no rows to read: hiding the
    // button left only a console warning. The person at the table gets
    // a button that writes this page — the caption says so.
    const handler = makeExportCsvHandler(
      { scope: "all" },
      serverSource(),
      COLUMNS
    );
    expect(handler).toBeDefined();
  });

  it("keeps the button for a frontend source, which can answer", () => {
    expect(
      makeExportCsvHandler({ scope: "all" }, source(), COLUMNS)
    ).toBeDefined();
  });
});

describe("exportCsv.fetchAll", () => {
  /** A source of `total` rows, answered `limit` at a time. */
  const pager = (total: number) =>
    vi.fn((query: { page?: number; limit?: number }) => {
      const limit = query.limit ?? 100;
      const start = ((query.page ?? 1) - 1) * limit;
      return Promise.resolve(
        Array.from(
          { length: Math.max(0, Math.min(limit, total - start)) },
          (_, i) => ({
            id: String(start + i + 1),
            name: `Row ${start + i + 1}`,
          })
        )
      );
    });

  it("walks every page and stops at the short one", async () => {
    const fetchPage = pager(25);
    const rows = await fetchAllExportRows(serverSource(), {
      fetchPage,
      pageSize: 10,
    });
    expect(rows).toHaveLength(25);
    // 10, 10, 5 — the short page ends it, with no extra request after.
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls[0]?.[0]).toMatchObject({ page: 1, limit: 10 });
    expect(fetchPage.mock.calls[2]?.[0]).toMatchObject({ page: 3, limit: 10 });
  });

  it("stops at the cap and says so rather than writing a partial file quietly", async () => {
    const onCapped = vi.fn();
    const rows = await fetchAllExportRows(serverSource(), {
      fetchPage: pager(1000),
      pageSize: 10,
      maxRows: 25,
      onCapped,
    });
    expect(rows).toHaveLength(25);
    expect(onCapped).toHaveBeenCalledExactlyOnceWith({ rows: 25, maxRows: 25 });
  });

  it("reports the cap even when a page lands exactly on it", async () => {
    // 3 pages of 10 is exactly 30, and a full last page proves nothing about
    // what comes after it — silence here would be a truncated file.
    const onCapped = vi.fn();
    const rows = await fetchAllExportRows(serverSource(), {
      fetchPage: pager(1000),
      pageSize: 10,
      maxRows: 30,
      onCapped,
    });
    expect(rows).toHaveLength(30);
    expect(onCapped).toHaveBeenCalledExactlyOnceWith({ rows: 30, maxRows: 30 });
  });

  it("stays quiet when the set genuinely ended before the cap", async () => {
    const onCapped = vi.fn();
    const rows = await fetchAllExportRows(serverSource(), {
      fetchPage: pager(25),
      pageSize: 10,
      maxRows: 1000,
      onCapped,
    });
    expect(rows).toHaveLength(25);
    expect(onCapped).not.toHaveBeenCalled();
  });

  it("uses the table's own page size when none is given", async () => {
    const fetchPage = pager(5);
    await fetchAllExportRows(serverSource(), { fetchPage });
    expect(fetchPage.mock.calls[0]?.[0]).toMatchObject({ limit: 25 });
  });

  it("gives the button back, and exports what it fetched", async () => {
    const onAfterExport = vi.fn();
    const handler = makeExportCsvHandler(
      {
        scope: "all",
        fetchAll: { fetchPage: pager(3), pageSize: 10 },
        onAfterExport,
      },
      serverSource(),
      COLUMNS
    );
    expect(handler).toBeDefined();
    await handler?.();
    expect(onAfterExport).toHaveBeenCalledOnce();
    expect(onAfterExport.mock.calls[0]?.[0].rows).toHaveLength(3);
  });
});

describe("exportCsv.request", () => {
  it("sends the current view instead of building a file", () => {
    let seen: ExportRequest<Row> | undefined;
    const handler = makeExportCsvHandler<Row>(
      {
        request: (info) => {
          seen = info;
        },
      },
      source(),
      COLUMNS
    );
    handler?.();

    expect(seen?.query).toEqual({
      page: 3,
      limit: 25,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
      filters: { team: "Core" },
      groupBy: undefined,
    });
    expect(seen?.scope).toBe("page");
    expect(seen?.columns.map((column) => column.key)).toEqual(["name"]);
    expect(seen?.filename).toBe("export.csv");
  });

  it("passes the chosen scopes through to the request", () => {
    let seen: ExportRequest<Row> | undefined;
    makeExportCsvHandler<Row>(
      {
        scope: "all",
        columns: ["name"],
        filename: "people.csv",
        request: (info) => {
          seen = info;
        },
      },
      source(),
      COLUMNS
    )?.();

    expect(seen?.scope).toBe("all");
    expect(seen?.filename).toBe("people.csv");
  });

  it("never runs the browser export hooks when the host takes over", () => {
    const onBeforeExport = vi.fn();
    const onAfterExport = vi.fn();
    makeExportCsvHandler<Row>(
      {
        request: () => undefined,
        onBeforeExport,
        onAfterExport,
      },
      source(),
      COLUMNS
    )?.();

    // No file was built, so nothing brackets the building of one.
    expect(onBeforeExport).not.toHaveBeenCalled();
    expect(onAfterExport).not.toHaveBeenCalled();
  });
});

/**
 * A host export the test settles by hand, so the busy window can be inspected
 * while it is open.
 */
function pendingRequest(): {
  request: () => Promise<void>;
  settle: () => void;
} {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { request: () => promise, settle: () => release() };
}

describe("useExportHandler", () => {
  /** A button wired exactly the way every adapter wires it. */
  function Harness({ request }: { request: () => void | Promise<void> }) {
    const { onExportCsv, exportBusy, exportAnnouncement } = useExportHandler(
      makeExportCsvHandler<Row>({ request }, source(), COLUMNS)
    );
    return (
      <>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exportBusy}
          aria-busy={exportBusy}
        >
          Export
        </button>
        <ExportAnnouncer announcement={exportAnnouncement} />
      </>
    );
  }

  it("marks the button busy while the host is working, then releases it", async () => {
    const { request, settle } = pendingRequest();
    render(<Harness request={request} />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      settle();
      await Promise.resolve();
    });
    expect(button).not.toBeDisabled();
  });

  it("refuses a second click while the first export is still running", () => {
    const request = vi.fn(() => new Promise<void>(() => undefined));
    render(<Harness request={request} />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    fireEvent.click(button);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("releases the button when the export fails", async () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const request = () => Promise.reject(new Error("backend said no"));
    render(<Harness request={request} />);
    const button = screen.getByRole("button");

    await act(async () => {
      button.click();
      await Promise.resolve();
    });

    // A rejected export must not disable the button for the rest of the
    // session — the user has to be able to try again.
    expect(button).not.toBeDisabled();
    // …and the failure is reported rather than swallowed or left to float as
    // an unhandled rejection in the host's error reporting.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("exportCsv.request rejected")
    );
  });

  it("announces the outcome, because a download says nothing on its own", async () => {
    const { request, settle } = pendingRequest();
    render(<Harness request={request} />);

    // The region exists before it has anything to say: one that appears
    // together with its message is frequently never announced.
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    // Nothing is claimed while the work is still running.
    expect(region).toHaveTextContent("");

    await act(async () => {
      settle();
      await Promise.resolve();
    });
    expect(region).toHaveTextContent("Export complete");
  });

  it("announces a failure, so a silent failure is not silent", async () => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<Harness request={() => Promise.reject(new Error("no"))} />);

    await act(async () => {
      screen.getByRole("button", { name: "Export" }).click();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Export failed");
  });

  it("says it again when the same export runs twice", async () => {
    render(<Harness request={() => Promise.resolve()} />);
    const region = screen.getByRole("status");
    const button = screen.getByRole("button", { name: "Export" });

    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    const first = region.textContent ?? "";

    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    // Identical live-region text is announced once, so the second outcome has
    // to differ as text while reading identically — an invisible separator.
    expect(region.textContent).not.toBe(first);
    expect(region).toHaveTextContent("Export complete");
  });

  it("uses the table's own labels, so the announcement is localizable", async () => {
    function Localized() {
      const state = useExportHandler(
        makeExportCsvHandler<Row>(
          { request: () => Promise.resolve() },
          source(),
          COLUMNS
        ),
        { exportDone: "Exportation terminée" }
      );
      return (
        <>
          <button type="button" onClick={state.onExportCsv}>
            Export
          </button>
          <ExportAnnouncer announcement={state.exportAnnouncement} />
        </>
      );
    }
    render(<Localized />);
    await act(async () => {
      screen.getByRole("button").click();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Exportation terminée"
    );
  });

  it("reports the status for a kit that shows more than a spinner", () => {
    function Status() {
      const { exportStatus, onExportCsv } = useExportHandler(
        makeExportCsvHandler<Row>(true, source(), COLUMNS)
      );
      return (
        <button type="button" onClick={onExportCsv} data-status={exportStatus}>
          Export
        </button>
      );
    }
    render(<Status />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("data-status", "idle");
    act(() => {
      button.click();
    });
    expect(button).toHaveAttribute("data-status", "done");
  });

  it("marks the export failed when the handler throws before returning", () => {
    const { result } = renderHook(() =>
      useExportHandler(() => {
        throw new Error("disk full");
      })
    );
    let thrown: unknown;
    act(() => {
      try {
        result.current.onExportCsv?.();
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toEqual(expect.objectContaining({ message: "disk full" }));
    expect(result.current.exportStatus).toBe("failed");
    expect(result.current.exportAnnouncement).toContain("Export failed");
  });

  it("stays synchronous, and never busy, for the built-in export", () => {
    function Plain() {
      const { exportBusy, onExportCsv } = useExportHandler(
        makeExportCsvHandler<Row>(true, source(), COLUMNS)
      );
      return (
        <button type="button" onClick={onExportCsv} aria-busy={exportBusy}>
          Export
        </button>
      );
    }
    render(<Plain />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-busy", "false");
  });

  it("names the button Export this page when all falls back to the page", () => {
    function Label() {
      const { exportLabel } = useExportHandler(
        () => undefined,
        undefined,
        "csv",
        true
      );
      return <button type="button">{exportLabel}</button>;
    }
    render(<Label />);
    expect(screen.getByRole("button")).toHaveTextContent("Export this page");
  });
});
