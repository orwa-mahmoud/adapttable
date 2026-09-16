/**
 * What a capability-less source is allowed to offer.
 *
 * The unit tests in core prove the contract answers correctly. This is the
 * whole table over a source that holds one page: the controls that cannot
 * honestly work are OFF, in the DOM, with the reason attached — and a source
 * that declares it can do more gets those same controls back.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type {
  ColumnDef,
  ExportCsvOptions,
  TableLabels,
  TableSource,
} from "./index";

interface Row {
  id: string;
  team: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", team: "Core", name: "Ada" },
  { id: "2", team: "Web", name: "Grace" },
];

const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * One page out of 250 rows, and nothing else: no `allFilteredRows`, no
 * server groups. Every source written against v2 that pages on a backend
 * looks exactly like this.
 */
const pagedSource = (
  capabilities?: TableSource<Row>["capabilities"]
): TableSource<Row> => ({
  rows: ROWS,
  total: 250,
  capabilities,
  page: 1,
  limit: 2,
  defaultLimit: 2,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  sortLevels: [],
  toggleSortLevel: () => undefined,
  groupBy: undefined,
  extra: {},
  isLoading: false,
  isFetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  error: null,
  paginationMode: "paged",
  setPage: () => undefined,
  setLimit: () => undefined,
  setSort: () => undefined,
  setSearch: () => undefined,
  setGroupBy: () => undefined,
  setExtra: () => undefined,
  setExtras: () => undefined,
  clearExtras: () => undefined,
  clearAll: () => undefined,
  fetchNextPage: () => undefined,
  refetch: () => undefined,
});

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

const renderTable = (
  capabilities?: TableSource<Row>["capabilities"],
  exportCsv: ExportCsvOptions<Row> = { scope: "all" },
  labels?: Partial<TableLabels>
) =>
  render(
    <DataTable
      source={pagedSource(capabilities)}
      columns={COLS}
      rowKey={(r) => r.id}
      exportCsv={exportCsv}
      groupBy="team"
      statusBar
      bulkActions={[{ key: "x", label: "X", onClick: vi.fn() }]}
      labels={labels}
    />
  );

const EXPORT_REASON =
  "Export all is off — this source provides one page at a time.";
const GROUPING_REASON = "Grouping is off — this source cannot group.";

describe("a source that holds one page", () => {
  it("turns the export off and says why on the control", () => {
    renderTable();
    const button = part("export-csv-button");
    expect(button).toBeDisabled();
    // The reason travels with the control, not only with the status bar.
    expect(button).toHaveAttribute("title", EXPORT_REASON);
    // And the caption still names the format, because the format is not
    // what went wrong.
    expect(button).toHaveTextContent("Export CSV");
  });

  it("puts the localized reason on the disabled control", () => {
    const reason = "All rows need a retrieval route.";
    renderTable(undefined, { scope: "all" }, { noticeExportAllPage: reason });
    expect(part("export-csv-button")).toHaveAttribute("title", reason);
    expect(screen.getByText(reason)).toBeInTheDocument();
  });

  it("states both reasons in the status bar", () => {
    renderTable();
    expect(screen.getByText(EXPORT_REASON)).toBeInTheDocument();
    expect(screen.getByText(GROUPING_REASON)).toBeInTheDocument();
  });

  it("renders flat rows rather than pretending to group", () => {
    renderTable();
    expect(part("group-header")).toBeNull();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("still offers all 250 matching, because the count is the server's", () => {
    renderTable();
    fireEvent.click(screen.getByLabelText("Select all"));
    expect(part("select-all-banner")).not.toBeNull();
  });
});

describe("a source that declares what it cannot do", () => {
  const nothing: TableSource<Row>["capabilities"] = {
    fullDataset: false,
    grouping: false,
    selectAcrossPages: false,
    exportScope: "page",
    totalCount: "loaded",
  };

  it("withdraws the cross-page selection its shape would have allowed", () => {
    renderTable(nothing);
    fireEvent.click(screen.getByLabelText("Select all"));
    // Two rows are selected and the bar says so — what is gone is the offer
    // to extend that to 248 rows the source cannot name.
    expect(screen.getAllByText("2 selected").length).toBeGreaterThan(0);
    expect(part("select-all-banner")).toBeNull();
  });
});

describe("a source that declares what it can do", () => {
  const claimsAll: TableSource<Row>["capabilities"] = {
    fullDataset: false,
    grouping: false,
    selectAcrossPages: true,
    exportScope: "all",
    totalCount: "exact",
  };

  it("stays disabled when the declaration supplies no rows", () => {
    renderTable(claimsAll);
    const button = part("export-csv-button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", EXPORT_REASON);
  });

  it("enables and uses a host request route", () => {
    const request = vi.fn();
    renderTable(claimsAll, { scope: "all", request });
    const button = part("export-csv-button");
    expect(button).toBeEnabled();
    fireEvent.click(button!);
    expect(request).toHaveBeenCalledOnce();
  });

  it("enables and uses a host fetch-all route", async () => {
    const fetchPage = vi.fn(() => Promise.resolve([]));
    renderTable(claimsAll, { scope: "all", fetchAll: { fetchPage } });
    const button = part("export-csv-button");
    expect(button).toBeEnabled();
    fireEvent.click(button!);
    await waitFor(() => expect(fetchPage).toHaveBeenCalledOnce());
  });
});
