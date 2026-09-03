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

import type { TableSourceCapabilities } from "../source/capabilities";
import type { TableSource } from "../source/TableSource";
import type { ColumnDef } from "../types";
import { resetDevWarnings } from "../utils/devWarn";
import { ExportAnnouncer } from "./ExportAnnouncer";
import {
  type ExportAllControls,
  type ExportAllQuery,
  type ExportAllResult,
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
const CLAIMS_ALL: TableSourceCapabilities = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: true,
  exportScope: "all",
  totalCount: "exact",
};
const PAGE_ONLY: TableSourceCapabilities = {
  fullDataset: false,
  grouping: false,
  selectAcrossPages: false,
  exportScope: "page",
  totalCount: "loaded",
};

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
  it("hands onExportAll the exact page-free view without resolving rows", () => {
    const onBeforeExport = vi.fn();
    const onExportAll =
      vi.fn<(query: ExportAllQuery, controls: ExportAllControls) => void>();
    const tableSource = serverSource({
      sortLevels: [
        { key: "name", dir: "desc" },
        { key: "id", dir: "asc" },
      ],
      filterTree: {
        combinator: "and",
        conditions: [{ key: "team", op: "eq", value: "Core" }],
      },
      groupBy: "team,status",
    });
    const handler = makeExportCsvHandler(
      {
        scope: "all",
        filename: "people.csv",
        columns: ["name"],
        onBeforeExport,
        onExportAll,
      },
      tableSource,
      COLUMNS
    );
    const controller = new AbortController();

    handler?.({ signal: controller.signal });

    expect(onExportAll).toHaveBeenCalledWith(
      {
        search: "ada",
        sortBy: "name",
        sortDir: "desc",
        sortLevels: [
          { key: "name", dir: "desc" },
          { key: "id", dir: "asc" },
        ],
        filters: { team: "Core" },
        filterTree: {
          combinator: "and",
          conditions: [{ key: "team", op: "eq", value: "Core" }],
        },
        groupBy: ["team", "status"],
        columns: ["name"],
        visibleColumns: ["name"],
        format: "csv",
        filename: "people.csv",
      },
      { signal: controller.signal }
    );
    expect(onBeforeExport).not.toHaveBeenCalled();
  });

  it("prefers the progress-aware all route over the generic request", () => {
    const onExportAll = vi.fn();
    const request = vi.fn();
    makeExportCsvHandler(
      { scope: "all", onExportAll, request },
      serverSource(),
      COLUMNS
    )?.();
    expect(onExportAll).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it("asks the backend for the set, not for a page", () => {
    const request = vi.fn();
    const handler = makeExportCsvHandler(
      { scope: "all", request },
      serverSource({ capabilities: CLAIMS_ALL }),
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

  it("never turns an unavailable all-rows request into a page export", () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onAfterExport = vi.fn();
    const handler = makeExportCsvHandler(
      { scope: "all", onAfterExport },
      serverSource({ capabilities: CLAIMS_ALL }),
      COLUMNS
    );
    expect(handler).toBeDefined();
    handler?.();
    expect(onAfterExport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("No export was started")
    );
    warn.mockRestore();
    resetDevWarnings();
  });

  it("exports the complete source-owned set, not only the visible page", () => {
    const complete = [...ROWS, { id: "2", name: "Grace" }];
    const onAfterExport = vi.fn();
    makeExportCsvHandler(
      { scope: "all", onAfterExport },
      { ...source(), rows: ROWS, allFilteredRows: complete, total: 2 },
      COLUMNS
    )?.();
    expect(onAfterExport.mock.calls[0]?.[0].rows).toEqual(complete);
    expect(onAfterExport.mock.calls[0]?.[0].csv).toContain("Grace");
  });

  it("honors a page-only declaration even when rows are present", () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onAfterExport = vi.fn();
    makeExportCsvHandler(
      { scope: "all", onAfterExport },
      { ...source(), capabilities: PAGE_ONLY },
      COLUMNS
    )?.();
    expect(onAfterExport).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("No export was started")
    );
    warn.mockRestore();
    resetDevWarnings();
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
      serverSource({ capabilities: CLAIMS_ALL }),
      COLUMNS
    );
    expect(handler).toBeDefined();
    await handler?.();
    expect(onAfterExport).toHaveBeenCalledOnce();
    expect(onAfterExport.mock.calls[0]?.[0].rows).toHaveLength(3);
  });

  it("uses the host route when a page-only declaration constrains present rows", async () => {
    const fetched = [{ id: "2", name: "Fetched" }];
    const fetchPage = vi.fn(() => Promise.resolve(fetched));
    const onAfterExport = vi.fn();
    const handler = makeExportCsvHandler(
      {
        scope: "all",
        fetchAll: { fetchPage, pageSize: 10 },
        onAfterExport,
      },
      { ...source(), capabilities: PAGE_ONLY },
      COLUMNS
    );
    await handler?.();
    expect(fetchPage).toHaveBeenCalledOnce();
    expect(onAfterExport.mock.calls[0]?.[0].rows).toEqual(fetched);
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

type OnExportAll = (
  query: ExportAllQuery,
  controls: ExportAllControls
) => ExportAllResult | Promise<ExportAllResult>;

function ServerExportHarness({
  onExportAll,
}: {
  readonly onExportAll: OnExportAll;
}) {
  const state = useExportHandler(
    makeExportCsvHandler<Row>(
      { scope: "all", onExportAll },
      serverSource(),
      COLUMNS
    ),
    undefined,
    "csv",
    false,
    true
  );
  const progress = state.exportProgressState;
  return (
    <>
      <button
        type="button"
        onClick={state.onExportCsv}
        disabled={state.exportBusy}
      >
        Export
      </button>
      <span data-testid="status">{state.exportStatus}</span>
      <span data-testid="progress">{progress?.value ?? "indeterminate"}</span>
      <span data-testid="message">{progress?.message}</span>
      <span data-testid="error">{progress?.error}</span>
      {progress?.downloadUrl ? (
        <a href={progress.downloadUrl}>Download export</a>
      ) : null}
      {progress?.onCancel ? (
        <button type="button" onClick={progress.onCancel}>
          Cancel
        </button>
      ) : null}
      {progress?.onRetry ? (
        <button type="button" onClick={progress.onRetry}>
          Retry
        </button>
      ) : null}
      {progress?.onDismiss ? (
        <button type="button" onClick={progress.onDismiss}>
          Dismiss
        </button>
      ) : null}
      <ExportAnnouncer announcement={state.exportAnnouncement} />
    </>
  );
}

describe("exportCsv.onExportAll lifecycle", () => {
  it("reports determinate progress and a host message", () => {
    render(
      <ServerExportHarness
        onExportAll={(_query, controls) => {
          controls.setProgress?.(42);
          controls.setMessage?.("Building 21 of 50 pages");
          return new Promise(() => undefined);
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(screen.getByTestId("progress")).toHaveTextContent("42");
    expect(screen.getByTestId("message")).toHaveTextContent(
      "Building 21 of 50 pages"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Export 42% complete");
  });

  it("clamps host progress to the public 0–100 range", () => {
    render(
      <ServerExportHarness
        onExportAll={(_query, controls) => {
          controls.setProgress?.(140);
          return new Promise(() => undefined);
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByTestId("progress")).toHaveTextContent("100");
  });

  it("stays indeterminate until an empty settlement reports done", async () => {
    let settle!: () => void;
    const pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
    render(<ServerExportHarness onExportAll={() => pending} />);

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByTestId("progress")).toHaveTextContent("indeterminate");
    expect(screen.getByRole("status")).toHaveTextContent("Preparing export");

    await act(async () => {
      settle();
      await pending;
    });
    expect(screen.getByTestId("status")).toHaveTextContent("done");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Export complete");
  });

  it("offers the URL returned by the host", async () => {
    render(
      <ServerExportHarness
        onExportAll={() =>
          Promise.resolve({ url: "/exports/people.csv?token=signed" })
        }
      />
    );

    await act(async () => {
      screen.getByRole("button", { name: "Export" }).click();
      await Promise.resolve();
    });

    expect(
      screen.getByRole("link", { name: "Download export" })
    ).toHaveAttribute("href", "/exports/people.csv?token=signed");
    expect(screen.getByTestId("status")).toHaveTextContent("done");
  });

  it("shows a rejected error and retries with a fresh run", async () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onExportAll = vi
      .fn<OnExportAll>()
      .mockRejectedValueOnce(new Error("Report service unavailable"))
      .mockResolvedValueOnce(undefined);
    render(<ServerExportHarness onExportAll={onExportAll} />);

    await act(async () => {
      screen.getByRole("button", { name: "Export" }).click();
      await Promise.resolve();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("failed");
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Report service unavailable"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Export failed");

    await act(async () => {
      screen.getByRole("button", { name: "Retry" }).click();
      await Promise.resolve();
    });
    expect(onExportAll).toHaveBeenCalledTimes(2);
    expect(onExportAll.mock.calls[0]?.[1].signal).not.toBe(
      onExportAll.mock.calls[1]?.[1].signal
    );
    expect(screen.getByTestId("status")).toHaveTextContent("done");
    warn.mockRestore();
    resetDevWarnings();
  });

  it("aborts the host signal and ignores its late rejection", async () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let signal: AbortSignal | undefined;
    const onExportAll = vi.fn<OnExportAll>(
      (_query, controls) =>
        new Promise<void>((_resolve, reject) => {
          signal = controls.signal;
          controls.signal.addEventListener("abort", () => {
            reject(new DOMException("Cancelled", "AbortError"));
          });
        })
    );
    render(<ServerExportHarness onExportAll={onExportAll} />);

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(() => Promise.resolve());

    expect(signal?.aborted).toBe(true);
    expect(screen.getByTestId("status")).toHaveTextContent("cancelled");
    expect(screen.getByRole("status")).toHaveTextContent("Export cancelled");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    resetDevWarnings();
  });

  it("dismisses terminal surfaces without aborting or restarting", async () => {
    const onExportAll = vi
      .fn<OnExportAll>()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ url: "/exports/later.csv" });
    render(<ServerExportHarness onExportAll={onExportAll} />);

    await act(async () => {
      screen.getByRole("button", { name: "Export" }).click();
      await Promise.resolve();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("done");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    expect(screen.getByTestId("message")).toHaveTextContent("");
    expect(screen.getByTestId("error")).toHaveTextContent("");
    expect(onExportAll).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByRole("button", { name: "Export" }).click();
      await Promise.resolve();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("done");
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/exports/later.csv"
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(onExportAll).toHaveBeenCalledTimes(2);
  });

  it("keeps Retry on failure until dismiss clears the error", async () => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(
      <ServerExportHarness
        onExportAll={() => Promise.reject(new Error("disk full"))}
      />
    );

    await act(async () => {
      screen.getByRole("button", { name: "Export" }).click();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByTestId("error")).toHaveTextContent("disk full");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("dismisses a cancelled surface and leaves the host job aborted", () => {
    let signal: AbortSignal | undefined;
    render(
      <ServerExportHarness
        onExportAll={(_query, controls) => {
          signal = controls.signal;
          return new Promise(() => undefined);
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(signal?.aborted).toBe(true);
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
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

  it("disables the button, and says why, when all cannot reach past the page", () => {
    const exported = vi.fn();
    function Fallback() {
      const { exportLabel, exportDisabled, exportDisabledReason, onExportCsv } =
        useExportHandler(exported, undefined, "csv", true);
      return (
        <button
          type="button"
          onClick={onExportCsv}
          disabled={exportDisabled}
          title={exportDisabledReason}
        >
          {exportLabel}
        </button>
      );
    }
    render(<Fallback />);
    const button = screen.getByRole("button");
    // The caption still names the format the control produces — what changed
    // is that it cannot run, and the reason travels with the control.
    expect(button).toHaveTextContent("Export CSV");
    expect(button).toBeDisabled();
    expect(button.title).toBe(
      "Export all is off — this source provides one page at a time."
    );
  });

  it("refuses the export itself, not only through the disabled attribute", () => {
    const exported = vi.fn();
    function Unguarded() {
      const { onExportCsv } = useExportHandler(
        exported,
        undefined,
        "csv",
        true
      );
      // No `disabled`: a kit that forgets it, or a programmatic click, must
      // still not get the one-page file the button never offered.
      return (
        <button type="button" onClick={onExportCsv}>
          Export
        </button>
      );
    }
    render(<Unguarded />);
    fireEvent.click(screen.getByRole("button"));
    expect(exported).not.toHaveBeenCalled();
  });
});
