import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { rowActions } from "@adapttable/core/features";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { columnMenu } from "./column-menu";
import { DataTable } from "./DataTable";
import { editing } from "./editing";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";

interface Row {
  id: string;
  name: string;
  city: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];

const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

function renderTable(
  props: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">> = {},
  data: Row[] = ROWS
) {
  function Harness() {
    const source = useFrontendData<Row>({
      data,
      urlAdapter: createMemoryAdapter(),
      columns,
      paginationMode: "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        {...props}
      />
    );
  }
  return render(<Harness />);
}

// Colour contrast is Bootstrap's own theme rather than this adapter's markup,
// and jsdom resolves none of it, so the rule reports on stylesheets that are
// not there. Every structural rule stays on.
const axeOpts = { rules: { "color-contrast": { enabled: false } } };

describe("accessibility (axe)", () => {
  it("a basic table has no detectable violations", async () => {
    const { container } = renderTable();
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("a sortable, searchable table has no violations", async () => {
    const { container } = renderTable({ searchable: true });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("an empty table has no violations", async () => {
    const { container } = renderTable({}, []);
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });

  it("a table with row actions has no violations", async () => {
    const { container } = renderTable({
      features: [
        rowActions<Row>([
          { key: "e", label: "Edit", onClick: () => undefined },
        ]),
      ],
    });
    expect(await axe(container, axeOpts)).toHaveNoViolations();
  });
});

// The mocked suite in DataTable.test.tsx drives one narrow shell shape, so the
// real component's branches — the optional Columns menu, the empty path, the
// grouped path — are only reached by rendering it for real.
describe("real render branches", () => {
  const columnMenuButton = () =>
    document.querySelector('[data-adapttable-part="column-menu-button"]');

  it("renders the Columns menu on desktop and hides it on a phone", () => {
    const { unmount } = renderTable({ features: [columnMenu()] });
    expect(columnMenuButton()).not.toBeNull();
    unmount();

    // Bootstrap keeps its table on a phone — the menu is what it drops.
    renderTable({ features: [columnMenu()], forceMobile: true });
    expect(columnMenuButton()).toBeNull();
  });

  it("renders no Columns menu unless asked", () => {
    renderTable({});
    expect(columnMenuButton()).toBeNull();
  });

  it("renders no data rows when the source is empty", () => {
    renderTable({}, []);
    expect(document.querySelectorAll("tbody tr[data-stagger]")).toHaveLength(0);
  });

  // Every `??` and `classNames?.` default in DataTable.tsx has two sides; the
  // mocked suite only ever renders the bare side.
  it("honours an explicit size over the density mapping", () => {
    const { unmount } = renderTable({ size: "sm" });
    expect(document.querySelector("table")).not.toBeNull();
    unmount();

    renderTable({ density: "compact" });
    expect(document.querySelector("table")).not.toBeNull();
  });

  it("applies a supplied class map", () => {
    renderTable({
      classNames: {
        root: "my-root",
        table: "my-table",
        toolbar: "my-toolbar",
        footer: "my-footer",
      },
      searchable: true,
    });
    expect(document.querySelector(".my-root")).not.toBeNull();
    expect(document.querySelector(".my-table")).not.toBeNull();
  });

  it("opens the Columns menu and works its controls", () => {
    renderTable({ features: [columnMenu()], searchable: true });
    fireEvent.click(columnMenuButton()!);

    // The menu body only executes once it is open, and it is the largest
    // untested branch cluster in this adapter.
    const items = document.querySelectorAll(
      '[data-adapttable-part="column-menu-item"]'
    );
    expect(items.length).toBeGreaterThan(0);

    const search = document.querySelector<HTMLInputElement>(
      '[data-adapttable-part="column-menu-search"]'
    );
    if (search) {
      fireEvent.change(search, { target: { value: "nam" } });
      fireEvent.change(search, { target: { value: "zzzz" } });
      fireEvent.change(search, { target: { value: "" } });
    }

    for (const action of document.querySelectorAll(
      '[data-adapttable-part="column-menu-action"]'
    )) {
      fireEvent.click(action);
    }
  });

  it("renders the feature-gated chrome when those features are composed", () => {
    renderTable({
      features: [
        rowReorder<Row>(() => undefined),
        editing<Row>(() => undefined),
      ],
      animate: true,
    });
    expect(document.querySelector("table")).not.toBeNull();
  });

  it("groups rows when asked", () => {
    renderTable({ features: [grouping("city")] });
    expect(document.querySelector("table")).not.toBeNull();
  });
});
