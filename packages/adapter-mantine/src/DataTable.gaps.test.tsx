/**
 * Gap-fill for the Mantine DataTable — Toolbar branches (infinite-mode
 * rows-per-page, sort-by select, custom toolbar, hideSearch) and the
 * mobile card layout (selection + row actions + confirm).
 */
import {
  createMemoryAdapter,
  useChromeBodyData,
  useFrontendData,
  type VirtualTableRow,
} from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

vi.mock("@adapttable/core", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useChromeBodyData: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(useChromeBodyData).mockImplementation((chrome, props) => ({
    virtualization: {
      enabled: false,
      rows: props.source.rows.map((row, index) => ({
        row,
        index,
        key: props.rowKey(row),
      })),
      paddingTop: 0,
      paddingBottom: 0,
    },
    loadMoreRef: { current: null },
    canLoadMore: !chrome.isPaged && !props.source.error,
    virtualScrollRef: () => undefined,
  }));
});

function Harness(props: {
  rows?: Row[];
  mode?: "paged" | "infinite";
  isMobile?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}) {
  const source = useFrontendData<Row>({
    data: props.rows ?? ROWS,
    urlAdapter: createMemoryAdapter(),
    columns,
    paginationMode: props.mode ?? "paged",
  });
  return (
    <MantineProvider>
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        isMobile={props.isMobile}
        {...props.override}
      />
    </MantineProvider>
  );
}

describe("<DataTable> gaps", () => {
  it("shows the rows-per-page select in infinite mode and hides the footer", () => {
    render(<Harness mode="infinite" />);
    expect(screen.getAllByLabelText("Rows per page").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Page \d+ of/)).toBeNull();
  });

  it("renders the sort-by select when sortByOptions is supplied", () => {
    render(
      <Harness
        override={{
          sortByOptions: [{ value: "name", label: "Name" }],
        }}
      />
    );
    expect(screen.getAllByLabelText("Sort by").length).toBeGreaterThan(0);
  });

  it("renders a custom toolbar node and searchable={false} hides the search", () => {
    render(
      <Harness
        override={{
          toolbar: <button type="button">view</button>,
          searchable: false,
        }}
      />
    );
    expect(screen.getByText("view")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("the v1 hideSearch alias still hides the search (removed before release)", () => {
    render(<Harness override={{ hideSearch: true }} />);
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("applies a custom sticky toolbar offset", () => {
    const { container } = render(<Harness override={{ stickyTop: 42 }} />);
    const toolbar = container.querySelector<HTMLElement>(
      '[style*="position: sticky"]'
    );
    expect(toolbar?.style.top).toBe("42px");
  });

  it("mobile: renders selection checkboxes and row actions with confirm", () => {
    const onClick = vi.fn();
    const confirm = vi.fn((r: { onConfirm: () => void }) => r.onConfirm());
    render(
      <Harness
        isMobile
        override={{
          bulkActions: [{ key: "x", label: "X", onClick: vi.fn() }],
          rowActions: [
            {
              key: "del",
              label: "Delete",
              onClick,
              confirm: {
                title: "Sure?",
                message: () => "Delete?",
                confirmLabel: "Yes",
              },
            },
          ],
          confirm,
        }}
      />
    );
    expect(screen.getAllByLabelText("Select row")).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    expect(confirm).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("desktop: renders icon row actions and fires them", () => {
    const onClick = vi.fn();
    render(
      <Harness
        override={{
          rowActions: [
            {
              key: "view",
              label: "View",
              icon: <span aria-hidden>i</span>,
              onClick,
            },
          ],
        }}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("mobile: renders icon row actions and fires them", () => {
    const onClick = vi.fn();
    render(
      <Harness
        isMobile
        override={{
          rowActions: [
            {
              key: "view",
              label: "View",
              icon: <span aria-hidden>i</span>,
              onClick,
            },
          ],
        }}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]!);
    expect(onClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("mobile: uses mobileLabel / key fallback for non-string headers", () => {
    const nodeCols: ColumnDef<Row>[] = [
      {
        key: "name",
        header: <em>N</em>,
        accessor: (r) => r.name,
        mobileLabel: "Person",
      },
    ];
    render(<Harness isMobile override={{ columns: nodeCols }} />);
    // One "Person" label per card (two rows).
    expect(screen.getAllByText("Person")).toHaveLength(2);
  });

  it("renders a slots.skeleton override while loading", () => {
    function LoadingHarness() {
      const source = useFrontendData<Row>({
        data: [],
        urlAdapter: createMemoryAdapter(),
        columns,
        paginationMode: "paged",
        isLoading: true,
      });
      return (
        <MantineProvider>
          <DataTable
            source={source}
            columns={columns}
            rowKey={(r) => r.id}
            slots={{ skeleton: <div>loading custom</div> }}
          />
        </MantineProvider>
      );
    }
    render(<LoadingHarness />);
    expect(screen.getByText("loading custom")).toBeInTheDocument();
  });

  it("virtualizes desktop rows when enabled", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          {
            row: { id: "b", name: "Bob" },
            index: 1,
            key: "b",
          } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 48,
        paddingBottom: 48,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });

    render(
      <Harness
        mode="infinite"
        rows={[
          { id: "a", name: "Alice" },
          { id: "b", name: "Bob" },
          { id: "c", name: "Charlie" },
        ]}
        override={{ virtualize: true, estimateRowSize: 48 }}
      />
    );

    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).toBeNull();
  });

  it("virtualizes mobile cards when enabled", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [
          {
            row: { id: "c", name: "Charlie" },
            index: 2,
            key: "c",
          } satisfies VirtualTableRow<Row>,
        ],
        paddingTop: 264,
        paddingBottom: 0,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });

    render(
      <Harness
        mode="infinite"
        isMobile
        rows={[
          { id: "a", name: "Alice" },
          { id: "b", name: "Bob" },
          { id: "c", name: "Charlie" },
        ]}
        override={{ virtualize: true, estimateCardSize: 132 }}
      />
    );

    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });
});
