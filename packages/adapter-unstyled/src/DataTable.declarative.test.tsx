import {
  createMemoryAdapter,
  type TableLabels,
  type UrlStateAdapter,
  useFrontendData,
} from "@adapttable/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, DataTableClassNames, FilterDef } from "./index";

interface Row {
  id: string;
  firstName: string;
  city: string;
  department: { name: string };
  hiredAt: string;
  age: number;
}

const ROWS: Row[] = [
  {
    id: "1",
    firstName: "Alice",
    city: "Dubai",
    department: { name: "Sales" },
    hiredAt: "2026-01-10",
    age: 30,
  },
  {
    id: "2",
    firstName: "Bob",
    city: "Riyadh",
    department: { name: "Ops" },
    hiredAt: "2025-05-01",
    age: 45,
  },
  {
    id: "3",
    firstName: "Carol",
    city: "Dubai",
    department: { name: "Ops" },
    hiredAt: "2024-03-15",
    age: 52,
  },
];

const CITY_OPTIONS = [
  { value: "Dubai", label: "Dubai" },
  { value: "Riyadh", label: "Riyadh" },
];
const DEPT_OPTIONS = [
  { value: "Sales", label: "Sales" },
  { value: "Ops", label: "Ops" },
];

const ALL_TYPE_FILTERS: FilterDef<Row>[] = [
  { key: "firstName", type: "text", placeholder: "Type a name" },
  { key: "city", type: "select", options: CITY_OPTIONS },
  {
    key: "department.name",
    type: "multiSelect",
    label: "Department",
    options: DEPT_OPTIONS,
  },
  { key: "hiredAt", type: "dateRange" },
  { key: "age", type: "numberRange" },
];

const rowKey = (r: Row) => r.id;
const params = (adapter: UrlStateAdapter) =>
  new URLSearchParams(adapter.getSearch());
const openFilters = () =>
  fireEvent.click(screen.getByRole("button", { name: /^filters/i }));
const chipsStrip = () => {
  const strip = document.querySelector('[data-adapttable-part="chips"]');
  expect(strip).toBeInstanceOf(HTMLElement);
  return strip as HTMLElement;
};

function renderAllTypes(
  initialUrl = "",
  classNames?: DataTableClassNames,
  labels?: TableLabels
) {
  const adapter = createMemoryAdapter(initialUrl);
  render(
    <DataTable<Row>
      data={ROWS}
      urlAdapter={adapter}
      rowKey={rowKey}
      columns={[{ key: "firstName" }]}
      filters={ALL_TYPE_FILTERS}
      classNames={classNames}
      labels={labels}
    />
  );
  openFilters();
  return adapter;
}

/** The Operator `<select>` of the named range field's group. */
const rangeOperator = (groupName: string, name = "Operator") =>
  within(screen.getByRole("group", { name: groupName })).getByRole("combobox", {
    name,
  });

/** A value input (`Value` / `From` / `To`) inside the named range group. */
const rangeInput = (groupName: string, label: string) =>
  within(screen.getByRole("group", { name: groupName })).getByLabelText(label);

describe("<DataTable> declarative columns + filters (unstyled)", () => {
  it("zero ceremony: data + filters array filter rows, chip, clear all", () => {
    const adapter = createMemoryAdapter("");
    render(
      <DataTable<Row>
        data={ROWS}
        urlAdapter={adapter}
        rowKey={rowKey}
        columns={[{ key: "firstName" }, { key: "city" }]}
        filters={[{ key: "city", type: "select", options: CITY_OPTIONS }]}
      />
    );
    expect(screen.getByText("Bob")).toBeInTheDocument();

    openFilters();
    fireEvent.change(screen.getByRole("combobox", { name: "City" }), {
      target: { value: "Dubai" },
    });

    // The frontend tier applies the declarative predicate automatically.
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(params(adapter).get("f_city")).toBe("Dubai");

    // A chip labelled from the definition appears; clear-all restores rows.
    const chips = chipsStrip();
    expect(chips).toHaveTextContent("City: Dubai");
    fireEvent.click(within(chips).getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(params(adapter).get("f_city")).toBeNull();
  });

  it("auto-derives headers from keys and renders dot-path nested cells", () => {
    render(
      <DataTable<Row>
        data={ROWS}
        urlAdapter={createMemoryAdapter("")}
        rowKey={rowKey}
        columns={[{ key: "firstName" }, { key: "department.name" }]}
      />
    );
    expect(
      screen.getByRole("columnheader", { name: "First Name" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getAllByText("Ops")).toHaveLength(2);
  });

  it("server tier: emits once on mount with URL-restored params, rows untouched, footer from total", () => {
    const onQueryChange = vi.fn();
    render(
      <DataTable<Row>
        data={ROWS}
        total={57}
        onQueryChange={onQueryChange}
        urlAdapter={createMemoryAdapter("page=2&q=ali")}
        rowKey={rowKey}
        columns={[{ key: "firstName" }]}
      />
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 25,
        search: "ali",
        sortBy: undefined,
        sortDir: undefined,
        filters: {},
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    // No local filtering: the server's rows render as returned, even though
    // the restored search term matches only Alice.
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
    // The pager reflects the server total, not the row count.
    expect(screen.getByText("Showing 26–50 of 57")).toBeInTheDocument();
  });

  it("server tier: shows the skeleton while the first page loads", () => {
    render(
      <DataTable<Row>
        data={[]}
        total={0}
        loading
        onQueryChange={vi.fn()}
        urlAdapter={createMemoryAdapter("")}
        rowKey={rowKey}
        columns={[{ key: "firstName" }]}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="loading"]')
    ).toBeInTheDocument();
  });

  it("text filter writes its key and an empty value clears it", () => {
    const adapter = renderAllTypes();
    const input = screen.getByRole("textbox", { name: "First Name" });
    expect(input).toHaveAttribute("placeholder", "Type a name");
    fireEvent.change(input, { target: { value: "ali" } });
    expect(params(adapter).get("f_firstName")).toBe("ali");
    fireEvent.change(input, { target: { value: "" } });
    expect(params(adapter).get("f_firstName")).toBeNull();
  });

  it("multiSelect checkboxes accumulate, remove, and clear the key", () => {
    const adapter = renderAllTypes();
    fireEvent.click(screen.getByRole("checkbox", { name: "Sales" }));
    expect(params(adapter).get("f_department.name")).toBe("Sales");
    expect(chipsStrip()).toHaveTextContent("Department: Sales");
    fireEvent.click(screen.getByRole("checkbox", { name: "Ops" }));
    expect(params(adapter).get("f_department.name")).toBe("Sales,Ops");
    fireEvent.click(screen.getByRole("checkbox", { name: "Sales" }));
    expect(params(adapter).get("f_department.name")).toBe("Ops");
    // Unchecking the last option writes [] — which clears the key.
    fireEvent.click(screen.getByRole("checkbox", { name: "Ops" }));
    expect(params(adapter).get("f_department.name")).toBeNull();
  });

  it("lists the localized operators per range flavour", () => {
    renderAllTypes("", undefined, {
      operator: "Vergleich",
      opAtLeast: "Mindestens",
      opOn: "Am",
    });
    const optionTexts = (groupName: string) =>
      within(rangeOperator(groupName, "Vergleich"))
        .getAllByRole("option")
        .map((option) => option.textContent);
    // The placeholder option carries the (localized) Operator label, then
    // the four comparisons in their number wording…
    expect(optionTexts("Age")).toEqual([
      "Vergleich",
      "Equal",
      "Mindestens",
      "At most",
      "Between",
    ]);
    // …and the date flavour swaps in the On/On-or wordings.
    expect(optionTexts("Hired At")).toEqual([
      "Vergleich",
      "Am",
      "On or after",
      "On or before",
      "Between",
    ]);
  });

  it("dateRange: Between exposes labeled From/To inputs writing both keys", () => {
    const adapter = renderAllTypes();
    fireEvent.change(rangeOperator("Hired At"), {
      target: { value: "between" },
    });
    fireEvent.change(rangeInput("Hired At", "From"), {
      target: { value: "2025-01-01" },
    });
    fireEvent.change(rangeInput("Hired At", "To"), {
      target: { value: "2026-12-31" },
    });
    const p = params(adapter);
    expect(p.get("f_hiredAtFrom")).toBe("2025-01-01");
    expect(p.get("f_hiredAtTo")).toBe("2026-12-31");
    expect(chipsStrip()).toHaveTextContent("Hired At ≥ 2025-01-01");
    expect(chipsStrip()).toHaveTextContent("Hired At ≤ 2026-12-31");
    // Carol (hired 2024) drops out on the frontend tier.
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("numberRange: At least types into ONE input and writes only the Min key", () => {
    const adapter = renderAllTypes();
    fireEvent.change(rangeOperator("Age"), { target: { value: "gte" } });
    // The single-value operators expose exactly one bound input.
    const age = screen.getByRole("group", { name: "Age" });
    expect(within(age).getAllByRole("spinbutton")).toHaveLength(1);
    fireEvent.change(rangeInput("Age", "Value"), { target: { value: "40" } });
    const p = params(adapter);
    expect(p.get("f_ageMin")).toBe("40");
    expect(p.get("f_ageMax")).toBeNull();
    // The committed (number-parsed) value round-trips into the input.
    expect(rangeInput("Age", "Value")).toHaveValue(40);
    // Alice (30) falls below the bound; Bob (45) and Carol (52) stay.
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("numberRange: Equal writes BOTH keys with the single value", () => {
    const adapter = renderAllTypes();
    fireEvent.change(rangeOperator("Age"), { target: { value: "eq" } });
    fireEvent.change(rangeInput("Age", "Value"), { target: { value: "45" } });
    const p = params(adapter);
    expect(p.get("f_ageMin")).toBe("45");
    expect(p.get("f_ageMax")).toBe("45");
    // Only Bob (45) sits inside the collapsed [45, 45] range.
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();
  });

  it("numberRange: Between writes both keys and filters rows", () => {
    const adapter = renderAllTypes();
    fireEvent.change(rangeOperator("Age"), { target: { value: "between" } });
    fireEvent.change(rangeInput("Age", "From"), { target: { value: "40" } });
    fireEvent.change(rangeInput("Age", "To"), { target: { value: "50" } });
    const p = params(adapter);
    expect(p.get("f_ageMin")).toBe("40");
    expect(p.get("f_ageMax")).toBe("50");
    // Alice (30) and Carol (52) fall outside [40, 50].
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("selecting the operator placeholder clears the persisted pair", () => {
    const adapter = renderAllTypes("f_ageMin=40&f_ageMax=50");
    // Distinct URL bounds mount as Between with both inputs filled.
    const operator = rangeOperator("Age");
    expect(operator).toHaveValue("between");
    expect(rangeInput("Age", "From")).toHaveValue(40);
    expect(rangeInput("Age", "To")).toHaveValue(50);
    fireEvent.change(operator, { target: { value: "" } });
    const p = params(adapter);
    expect(p.get("f_ageMin")).toBeNull();
    expect(p.get("f_ageMax")).toBeNull();
    // The value inputs collapse until a comparison is chosen again.
    const age = screen.getByRole("group", { name: "Age" });
    expect(within(age).queryByLabelText("From")).toBeNull();
    expect(within(age).queryByLabelText("Value")).toBeNull();
    // All rows return once the range filter is gone.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("an equal Min/Max pair in the URL mounts as Equal with its value", () => {
    renderAllTypes("f_ageMin=5&f_ageMax=5");
    expect(rangeOperator("Age")).toHaveValue("eq");
    expect(rangeInput("Age", "Value")).toHaveValue(5);
  });

  it("URL-restored values populate every control", () => {
    renderAllTypes("f_city=Dubai&f_department.name=Sales,Ops&f_ageMin=25");
    expect(screen.getByRole("combobox", { name: "City" })).toHaveValue("Dubai");
    expect(screen.getByRole("checkbox", { name: "Sales" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Ops" })).toBeChecked();
    // A lone Min bound mounts as "At least" with its value in place.
    expect(rangeOperator("Age")).toHaveValue("gte");
    expect(rangeInput("Age", "Value")).toHaveValue(25);
  });

  it("applies every auto-form classNames hook", () => {
    // The Min/Max pair mounts the number range on Between, so its two
    // bound inputs render alongside the text input.
    renderAllTypes("f_ageMin=40&f_ageMax=50", {
      filterField: "c-field",
      filterLabel: "c-label",
      filterInput: "c-input",
      filterSelect: "c-select",
      filterOperator: "c-op",
      filterCheckboxGroup: "c-group",
      filterCheckbox: "c-check",
    });
    const count = (selector: string) =>
      document.querySelectorAll(selector).length;
    // Five definitions → five field wrappers and captions.
    expect(count('[data-adapttable-part="filter-field"].c-field')).toBe(5);
    expect(count('[data-adapttable-part="filter-label"].c-label')).toBe(5);
    // One text input + the URL-restored Between pair on the number range.
    expect(count('[data-adapttable-part="filter-input"].c-input')).toBe(3);
    expect(count('[data-adapttable-part="filter-select"].c-select')).toBe(1);
    // One operator select per range definition.
    expect(count('[data-adapttable-part="filter-operator"].c-op')).toBe(2);
    expect(
      count('[data-adapttable-part="filter-checkbox-group"].c-group')
    ).toBe(1);
    expect(count('[data-adapttable-part="filter-checkbox"].c-check')).toBe(2);
  });

  it("renders no Filters button for a declarative array with no definitions", () => {
    render(
      <DataTable<Row>
        data={ROWS}
        urlAdapter={createMemoryAdapter("")}
        rowKey={rowKey}
        columns={[{ key: "firstName" }]}
        filters={[]}
      />
    );
    expect(
      screen.queryByRole("button", { name: /^filters/i })
    ).not.toBeInTheDocument();
  });

  it("builds the form from column filter shorthands alone (no filters prop)", () => {
    const adapter = createMemoryAdapter("");
    render(
      <DataTable<Row>
        data={ROWS}
        urlAdapter={adapter}
        rowKey={rowKey}
        columns={[
          { key: "firstName" },
          { key: "city", filter: { type: "select", options: CITY_OPTIONS } },
          // Bare type without options → a select with only the "All" choice.
          { key: "department.name", filter: "select" },
        ]}
      />
    );
    openFilters();
    const city = screen.getByRole("combobox", { name: "City" });
    expect(within(city).getAllByRole("option")).toHaveLength(3);
    const dept = screen.getByRole("combobox", { name: "Name" });
    expect(within(dept).getAllByRole("option")).toHaveLength(1);
    fireEvent.change(city, { target: { value: "Riyadh" } });
    expect(params(adapter).get("f_city")).toBe("Riyadh");
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("namespaces every param under urlKey", () => {
    const adapter = createMemoryAdapter("");
    render(
      <DataTable<Row>
        data={ROWS}
        urlAdapter={adapter}
        urlKey="t"
        rowKey={rowKey}
        columns={[{ key: "firstName" }]}
        filters={[{ key: "city", type: "select", options: CITY_OPTIONS }]}
      />
    );
    openFilters();
    fireEvent.change(screen.getByRole("combobox", { name: "City" }), {
      target: { value: "Dubai" },
    });
    expect(params(adapter).get("t.f_city")).toBe("Dubai");
    expect(params(adapter).get("f_city")).toBeNull();
  });

  it("prebuilt source + declarative array: a scalar bag value is tolerated", () => {
    const COLS: ColumnDef<Row>[] = [
      { key: "firstName", header: "First Name", accessor: (r) => r.firstName },
    ];
    function Harness({ adapter }: Readonly<{ adapter: UrlStateAdapter }>) {
      // No arrayExtraKeys registered → the bag holds "Dubai" as a scalar.
      const source = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        columns: COLS,
      });
      return (
        <DataTable<Row>
          source={source}
          columns={COLS}
          rowKey={rowKey}
          filters={[
            { key: "city", type: "multiSelect", options: CITY_OPTIONS },
          ]}
        />
      );
    }
    const adapter = createMemoryAdapter("f_city=Dubai");
    render(<Harness adapter={adapter} />);
    openFilters();
    expect(screen.getByRole("checkbox", { name: "Dubai" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Riyadh" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Riyadh" }));
    expect(params(adapter).get("f_city")).toBe("Dubai,Riyadh");
  });

  it("urlSync={false} keeps state in memory and never touches the adapter", () => {
    const spy = {
      getSearch: vi.fn(() => ""),
      setSearch: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    };
    render(
      <DataTable<Row>
        data={ROWS}
        columns={[{ key: "firstName" }]}
        rowKey={(r) => r.id}
        urlAdapter={spy}
        urlSync={false}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(spy.getSearch).not.toHaveBeenCalled();
    expect(spy.setSearch).not.toHaveBeenCalled();
    expect(spy.subscribe).not.toHaveBeenCalled();
  });
});
