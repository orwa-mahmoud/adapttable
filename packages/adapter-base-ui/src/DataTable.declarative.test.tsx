import { createMemoryAdapter, type TableQuery } from "@adapttable/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, DataTableProps } from "./index";

interface Person {
  id: string;
  firstName: string;
  status: string;
  age: number;
  department: { name: string };
}

const PEOPLE: Person[] = [
  {
    id: "1",
    firstName: "Alice",
    status: "active",
    age: 34,
    department: { name: "Engineering" },
  },
  {
    id: "2",
    firstName: "Bob",
    status: "inactive",
    age: 28,
    department: { name: "Design" },
  },
  {
    id: "3",
    firstName: "Carol",
    status: "active",
    age: 45,
    department: { name: "Sales" },
  },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "firstName" },
  { key: "department.name" },
  { key: "status", filter: { type: "select", options: STATUS_OPTIONS } },
];

function renderTable(
  override: Partial<Omit<DataTableProps<Person>, "mode">> = {}
) {
  return render(
    <DataTable<Person>
      data={PEOPLE}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      urlAdapter={createMemoryAdapter("")}
      filters={[{ key: "age", type: "numberRange" }]}
      {...override}
    />
  );
}

/** Open a Base UI Select combobox and click one of its options. */
function pickOption(comboboxName: string, optionLabel: string) {
  const trigger = screen.getByRole("combobox", { name: comboboxName });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  const option = screen.getByRole("option", { name: optionLabel });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}

describe("<DataTable> declarative tiers (Base UI)", () => {
  it("column filter shorthands alone (no filters prop) render the auto form", async () => {
    renderTable({ filters: undefined });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    // The form mounts inside the popover a tick after opening — await it. The
    // status filter's select self-names by its field label "Status".
    expect(
      await screen.findByRole("combobox", { name: "Status" })
    ).toBeInTheDocument();
  });

  it("zero-ceremony e2e: a column select filter narrows rows, chips appear, clear-all restores", async () => {
    renderTable();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    // Open the filter popover and pick a status from the auto-built form.
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    await screen.findByRole("combobox", { name: "Status" });
    pickOption("Status", "Active");

    // Frontend tier: the declarative predicate filtered the rows.
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    // The runtime's chip label resolves the option label.
    expect(screen.getByText("Status: Active")).toBeInTheDocument();

    // Clear-all from the chip strip restores every row.
    const chips = screen.getByRole("list", { name: "Filters" });
    fireEvent.click(within(chips).getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Status: Active")).toBeNull();
  });

  it("zero-ceremony e2e: the operator-first numberRange filters rows through the URL number keys", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    // Operator first: pick the comparison, then fill the single value.
    await screen.findByRole("combobox", { name: "Operator" });
    pickOption("Operator", "At least");
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "40" },
    });
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.getByText("Age ≥ 40")).toBeInTheDocument();
  });

  it("restores Equal from a URL where both range keys carry the same value", async () => {
    renderTable({
      urlAdapter: createMemoryAdapter("f_budgetMin=5&f_budgetMax=5"),
      filters: [{ key: "budget", type: "numberRange" }],
    });
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    const operator = await screen.findByRole("combobox", { name: "Operator" });
    expect(operator).toHaveTextContent("Equal");
    expect(screen.getByLabelText("Value")).toHaveValue(5);
    expect(screen.queryByLabelText("From")).toBeNull();
    expect(screen.queryByLabelText("To")).toBeNull();
  });

  it("derives headers from keys: firstName → First Name", () => {
    renderTable();
    expect(
      screen.getByRole("columnheader", { name: "First Name" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Status" })
    ).toBeInTheDocument();
  });

  it("renders nested cell values from dot-path keys", () => {
    renderTable();
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("renders no filters affordance when the declarative array resolves to zero definitions", () => {
    renderTable({
      columns: [{ key: "firstName" }],
      filters: [],
    });
    expect(screen.queryByRole("button", { name: "Filters" })).toBeNull();
  });

  it("server tier: emits one consolidated query on mount, renders rows untouched, pages from total", () => {
    const onQueryChange =
      vi.fn<(query: TableQuery, info: { signal: AbortSignal }) => void>();
    renderTable({
      total: 60,
      loading: false,
      onQueryChange,
      urlAdapter: createMemoryAdapter("page=2&f_status=archived"),
      filters: [{ key: "status", type: "select", options: STATUS_OPTIONS }],
      columns: [{ key: "firstName" }, { key: "status" }],
    });

    // One consolidated emit with the URL-restored values.
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    const [query, info] = onQueryChange.mock.calls[0]!;
    expect(query).toEqual({
      page: 2,
      limit: 25,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      sortLevels: [],
      filters: { status: "archived" },
    });
    expect(info.signal).toBeInstanceOf(AbortSignal);

    // Server rows render untouched — the filter is the server's job here.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();

    // The pager derives from `total`: 60 rows at 25/page, restored to page 2.
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("urlSync={false} keeps state in memory and never touches the adapter", () => {
    const spy = {
      getSearch: vi.fn(() => ""),
      setSearch: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    };
    renderTable({ urlAdapter: spy, urlSync: false });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(spy.getSearch).not.toHaveBeenCalled();
    expect(spy.setSearch).not.toHaveBeenCalled();
    expect(spy.subscribe).not.toHaveBeenCalled();
  });
});
