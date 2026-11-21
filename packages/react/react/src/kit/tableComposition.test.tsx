/**
 * The table a kit gets from its pieces. Each test mounts the composition with
 * a native test kit and checks what a person meets: which body shows for the
 * state the data is in, where each region lands, and that the kit's pieces
 * receive the table's own state.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { contextMenu } from "../features/factories";
import { useTableFeatures } from "../features/featureHost";
import { FeatureProviders, slotRender } from "../features/providers";
import { COLUMN_MENU, CONTEXT_MENU_LIVE } from "../features/slotKeys";
import type { TableFeature } from "../features/tableFeature";
import { useFrontendData } from "../source/useFrontendData";
import { createMemoryAdapter } from "../url/adapter";
import {
  type KitTable,
  type KitTableFrameProps,
  type KitTableProps,
  TableComposition,
} from "./tableComposition";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cy" },
];

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];

function Frame({
  rootProps,
  rootRef,
  announcers,
  toolbarRef,
  toolbarClassName,
  toolbar,
  bars,
  refreshing,
  main,
  loadMore,
  footers,
  overlays,
  labels,
  rowCount,
  mobile,
  animate,
}: Readonly<KitTableFrameProps>) {
  return (
    <div
      ref={rootRef}
      {...rootProps}
      data-testid="root"
      data-rows={rowCount}
      data-mobile={String(mobile)}
      data-animate={String(animate)}
    >
      {announcers}
      <div data-testid="toolbar" ref={toolbarRef} className={toolbarClassName}>
        {toolbar}
      </div>
      {refreshing ? <progress aria-label={labels.loading} /> : null}
      {bars}
      {main}
      {loadMore ? (
        <div ref={loadMore.ref}>
          <button
            type="button"
            disabled={loadMore.busy}
            onClick={loadMore.onClick}
          >
            {labels.loadMore}
          </button>
        </div>
      ) : null}
      {footers}
      {overlays}
    </div>
  );
}

const kit: KitTable = {
  Frame,
  toolbar: (props) => (
    <span
      data-testid="kit-toolbar"
      data-filters-mode={props.filtersMode}
      data-filters-open={String(props.filtersOpen)}
    >
      {props.savedViewsMenu}
      {props.columnMenu}
      <button type="button" onClick={props.onCloseFilters}>
        Close filters
      </button>
    </span>
  ),
  body: (view, headerOffset, props) => (
    <ul
      data-testid="kit-body"
      data-kind={view.chrome.body}
      data-offset={headerOffset}
      className={props.classNames?.table}
    >
      {view.source.rows.map((row) => (
        <li key={props.rowKey(row)}>{props.rowKey(row)}</li>
      ))}
    </ul>
  ),
  skeleton: (rows, columnCount, labels) => (
    <output data-testid="kit-skeleton" data-rows={rows} data-cols={columnCount}>
      {labels.loading}
    </output>
  ),
  empty: (labels, onClear) => (
    <output data-testid="kit-empty">
      {onClear ? labels.noResults : labels.noData}
      {onClear ? (
        <button type="button" onClick={onClear}>
          {labels.clearAll}
        </button>
      ) : null}
    </output>
  ),
  error: (state, labels) => (
    <output data-testid="kit-error">
      {state.error.message}
      <button type="button" onClick={state.retry}>
        {labels.retry}
      </button>
    </output>
  ),
  footer: (view) => <span data-testid="kit-footer">{view.source.total}</span>,
};

type Override = Partial<Omit<KitTableProps<Row>, "mode" | "source">>;

interface HarnessProps {
  readonly rows?: readonly Row[];
  readonly isLoading?: boolean;
  readonly error?: Error;
  readonly url?: string;
  readonly override?: Override;
}

function Table({ rows, isLoading, error, url, override }: HarnessProps) {
  const [urlAdapter] = useState(() => createMemoryAdapter(url ?? ""));
  const source = useFrontendData<Row>({
    data: rows ?? ROWS,
    urlAdapter,
    columns,
    error: error ?? null,
    isLoading,
  });
  const props = useTableFeatures<KitTableProps<Row>>({
    columns,
    rowKey: (row) => row.id,
    source,
    ...override,
  });
  return (
    <FeatureProviders props={props}>
      <TableComposition<Row> props={props} kit={kit} />
    </FeatureProviders>
  );
}

function mount(props: HarnessProps = {}): void {
  render(<Table {...props} />);
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("TableComposition", () => {
  it("hands the kit's body the rows and the frame the surface attributes", () => {
    mount({
      override: {
        dir: "rtl",
        className: "host",
        classNames: { root: "surface", table: "grid", toolbar: "bar" },
        animate: true,
      },
    });
    const root = screen.getByTestId("root");
    expect(root).toHaveAttribute("dir", "rtl");
    expect(root).toHaveClass("host", "surface");
    expect(root).toHaveAttribute("data-rows", "3");
    expect(root).toHaveAttribute("data-animate", "true");
    expect(root).not.toHaveAttribute("aria-busy");
    expect(screen.getByTestId("toolbar")).toHaveClass("bar");
    const body = screen.getByTestId("kit-body");
    expect(body).toHaveClass("grid");
    expect(body.textContent).toBe("abc");
    expect(screen.getByTestId("kit-toolbar")).toHaveAttribute(
      "data-filters-mode",
      "popover"
    );
  });

  it("leaves the surface without a class when the host gives none", () => {
    mount();
    expect(screen.getByTestId("root")).not.toHaveAttribute("class");
    expect(screen.getByTestId("root")).toHaveAttribute("data-animate", "false");
  });

  it("draws the pager in its part with the host's class, after the table footer", () => {
    mount({
      override: {
        tableFooter: <em>totals</em>,
        classNames: { footer: "pager" },
      },
    });
    const tableFooter = part("table-footer");
    const footer = part("footer");
    expect(tableFooter).toHaveTextContent("totals");
    expect(footer).toHaveClass("pager");
    expect(footer).toContainElement(screen.getByTestId("kit-footer"));
    expect(screen.getByTestId("kit-footer")).toHaveTextContent("3");
    expect(
      tableFooter!.compareDocumentPosition(footer!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("draws no table-footer part without a table footer", () => {
    mount();
    expect(part("table-footer")).toBeNull();
  });

  it("shows the kit's skeleton while the first page loads, sized to the page", () => {
    mount({ rows: [], isLoading: true, override: { skeletonRows: 4 } });
    const skeleton = screen.getByTestId("kit-skeleton");
    expect(skeleton).toHaveAttribute("data-rows", "4");
    expect(skeleton).toHaveAttribute("data-cols", "1");
    expect(screen.queryByTestId("kit-body")).toBeNull();
  });

  it("shows the host's skeleton in place of the kit's", () => {
    mount({
      rows: [],
      isLoading: true,
      override: { slots: { skeleton: <i data-testid="own-skeleton" /> } },
    });
    expect(screen.getByTestId("own-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("kit-skeleton")).toBeNull();
  });

  it("shows the kit's no-data view for an empty table, with nothing to clear", () => {
    mount({ rows: [] });
    const empty = screen.getByTestId("kit-empty");
    expect(empty).toHaveTextContent("No data");
    expect(empty.querySelector("button")).toBeNull();
  });

  it("offers to clear the filters when nothing matched, and tells the host", () => {
    const onClearFilters = vi.fn();
    mount({ url: "q=zzz", override: { onClearFilters } });
    const empty = screen.getByTestId("kit-empty");
    expect(empty).toHaveTextContent("No results");
    fireEvent.click(empty.querySelector("button")!);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("prefers the host's no-results view, then its empty view", () => {
    const { unmount } = render(
      <Table
        url="q=zzz"
        override={{
          slots: { noResults: <i data-testid="none" />, empty: <i /> },
        }}
      />
    );
    expect(screen.getByTestId("none")).toBeInTheDocument();
    unmount();
    mount({
      url: "q=zzz",
      override: { slots: { empty: <i data-testid="blank" /> } },
    });
    expect(screen.getByTestId("blank")).toBeInTheDocument();
    expect(screen.queryByTestId("kit-empty")).toBeNull();
  });

  it("shows the kit's error view in place of the body when loading failed", () => {
    mount({ rows: [], error: new Error("offline") });
    expect(screen.getByTestId("kit-error")).toHaveTextContent("offline");
    expect(screen.queryByTestId("kit-body")).toBeNull();
    expect(screen.queryByTestId("kit-empty")).toBeNull();
  });

  it("gives the host's error slot the failure", () => {
    const error = vi.fn((state: { error: Error }): ReactNode => (
      <b>{state.error.message}</b>
    ));
    mount({
      rows: [],
      error: new Error("offline"),
      override: { slots: { error } },
    });
    expect(error).toHaveBeenCalled();
    expect(screen.getByText("offline").tagName).toBe("B");
    expect(screen.queryByTestId("kit-error")).toBeNull();
  });

  it("announces the table's status inside the surface, before the toolbar", () => {
    mount();
    const root = screen.getByTestId("root");
    const status = root.querySelector('[role="status"], [aria-live]');
    expect(status).not.toBeNull();
    expect(
      status!.compareDocumentPosition(screen.getByTestId("toolbar")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("hands the column and context menus actions that reach the table", () => {
    interface MenuProps {
      readonly onSortColumn: (key: string, dir: "asc" | "desc") => void;
      readonly onFilterColumn: () => void;
    }
    interface ContextProps {
      readonly rowFor: (rowId: string) => Row | undefined;
      readonly actions: {
        readonly onSort: (key: string, dir: "asc" | "desc") => void;
        readonly onHide: (key: string) => void;
        readonly onFilter: () => void;
        readonly onCopy: (target: unknown) => void;
      };
      readonly children: (regionProps: Record<string, unknown>) => ReactNode;
    }
    let menu: MenuProps | undefined;
    let context: ContextProps | undefined;
    const probe: TableFeature<Row> = {
      id: "menus",
      renders: [
        slotRender(COLUMN_MENU, (props: unknown) => {
          menu = props as MenuProps;
          return null;
        }),
        slotRender(CONTEXT_MENU_LIVE, (props: unknown) => {
          context = props as ContextProps;
          return <>{context.children({})}</>;
        }),
      ],
    };
    // The context menu's inputs come with its feature; the probe draws them.
    mount({
      override: { features: [contextMenu(), probe], enableColumnMenu: true },
    });
    const body = () => screen.getByTestId("kit-body").textContent;
    const toolbar = () => screen.getByTestId("kit-toolbar");

    act(() => menu!.onSortColumn("name", "desc"));
    expect(body()).toBe("cba");
    act(() => context!.actions.onSort("name", "asc"));
    expect(body()).toBe("abc");
    expect(context!.rowFor("b")).toEqual(ROWS[1]);

    act(() => menu!.onFilterColumn());
    expect(toolbar()).toHaveAttribute("data-filters-open", "true");
    fireEvent.click(screen.getByRole("button", { name: "Close filters" }));
    expect(toolbar()).toHaveAttribute("data-filters-open", "false");
    act(() => context!.actions.onFilter());
    expect(toolbar()).toHaveAttribute("data-filters-open", "true");

    act(() => context!.actions.onHide("name"));
    act(() => context!.actions.onCopy({ rowId: "a", columnKey: "name" }));
    expect(body()).toBe("abc");
  });
});
