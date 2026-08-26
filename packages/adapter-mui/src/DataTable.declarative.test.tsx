/**
 * The declarative engine through the MUI adapter: zero-ceremony data tiers
 * (`data`, `data` + `onQueryChange`), auto headers, dot-path cells, and the
 * auto-built filter form writing every filter type's state keys.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { createTheme, ThemeProvider } from "@mui/material";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AutoFilterForm } from "./components/AutoFilterForm";
import { DataTable } from "./DataTable";
import type { ColumnDef, FilterDef, FilterOption, TableQuery } from "./index";
import {
  defaultFilterRegistry,
  defaultLabels,
  resolveFilterRegistry,
} from "./index";
import { renderMui } from "./test-utils";

interface Person {
  id: string;
  firstName: string;
  status: string;
  hiredAt: string;
  budget: number;
  department: { name: string };
}

const PEOPLE: Person[] = [
  {
    id: "1",
    firstName: "Alice",
    status: "active",
    hiredAt: "2025-01-15",
    budget: 100,
    department: { name: "Engineering" },
  },
  {
    id: "2",
    firstName: "Bob",
    status: "blocked",
    hiredAt: "2025-06-01",
    budget: 900,
    department: { name: "Sales" },
  },
  {
    id: "3",
    firstName: "Cara",
    status: "active",
    hiredAt: "2026-02-10",
    budget: 500,
    department: { name: "Engineering" },
  },
];

const columns: ColumnDef<Person>[] = [
  { key: "firstName" },
  {
    key: "status",
    filter: {
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "blocked", label: "Blocked" },
      ],
    },
  },
  { key: "department.name" },
];

const FILTERS: FilterDef<Person>[] = [
  { key: "firstName", type: "text" },
  {
    key: "department.name",
    type: "multiSelect",
    label: "Department",
    options: [
      { value: "Engineering", label: "Engineering" },
      { value: "Sales", label: "Sales" },
    ],
  },
  { key: "hiredAt", type: "dateRange" },
  { key: "budget", type: "numberRange" },
  {
    key: "active",
    type: "boolean",
    label: "Active",
    getValue: (row) => row.status === "active",
  },
];

const theme = createTheme();

function mountTable(
  override: Partial<Omit<Parameters<typeof DataTable<Person>>[0], "mode">> = {},
  url = ""
) {
  const adapter = createMemoryAdapter(url);
  render(
    <ThemeProvider theme={theme}>
      <DataTable<Person>
        data={PEOPLE}
        columns={columns}
        rowKey={(r) => r.id}
        filters={FILTERS}
        urlAdapter={adapter}
        {...override}
      />
    </ThemeProvider>
  );
  return adapter;
}

const openFilters = () =>
  fireEvent.click(screen.getByRole("button", { name: /filters/i }));

const param = (adapter: ReturnType<typeof createMemoryAdapter>, key: string) =>
  new URLSearchParams(adapter.getSearch()).get(key);

// Each range widget renders as a labeled fieldset; re-query per assertion so
// re-renders never leave a stale DOM scope behind.
const budgetGroup = () => within(screen.getByRole("group", { name: "Budget" }));
const hiredGroup = () =>
  within(screen.getByRole("group", { name: "Hired At" }));

function openSelect(name: string, root?: HTMLElement) {
  const control = (root ? within(root) : screen).getByRole("combobox", {
    name,
  });
  fireEvent.mouseDown(control);
  const menuId = control.getAttribute("aria-controls");
  const menu = menuId ? document.getElementById(menuId) : null;
  if (!menu) throw new Error(`MUI select "${name}" did not open`);
  return within(menu);
}

function pickSelect(
  name: string,
  optionLabel: string | null,
  root?: HTMLElement
) {
  const menu = openSelect(name, root);
  const option =
    optionLabel === null
      ? menu.getAllByRole("option", { hidden: true })[0]!
      : menu.getByRole("option", { name: optionLabel, hidden: true });
  fireEvent.click(option);
}

describe("declarative DataTable (MUI)", () => {
  it("column filter shorthands alone (no filters prop) render the auto form", () => {
    mountTable({
      filters: undefined,
      columns: [
        { key: "name" },
        {
          key: "status",
          filter: {
            type: "select",
            options: [{ value: "active", label: "Active" }],
          },
        },
      ],
    });
    openFilters();
    expect(
      screen.getByRole("combobox", { name: "Status" })
    ).toBeInTheDocument();
  });

  it("zero ceremony: select filter narrows rows, raises a chip, clear-all restores", () => {
    const adapter = mountTable();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    openFilters();
    pickSelect("Status", "Active");

    // Frontend tier auto-applies the predicate: blocked Bob is gone.
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(param(adapter, "f_status")).toBe("active");

    // The runtime's chip label uses the option label, not the raw value.
    expect(screen.getByText("Status: Active")).toBeInTheDocument();

    // Clear-all from the chip strip restores every row.
    const strip = screen.getByRole("list", { name: "Filters" });
    fireEvent.click(within(strip).getByRole("button", { name: "Clear all" }));
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(param(adapter, "f_status")).toBeNull();
  });

  it("auto-derives headers from keys and renders dot-path cells", () => {
    mountTable();
    expect(
      screen.getByRole("columnheader", { name: "First Name" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Status" })
    ).toBeInTheDocument();
    // "department.name" humanizes to its last segment…
    expect(
      screen.getByRole("columnheader", { name: "Name" })
    ).toBeInTheDocument();
    // …and the cell value is read through the dot path.
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getAllByText("Engineering")).toHaveLength(2);
  });

  it("renders no filters affordance when nothing declares a filter", () => {
    mountTable({
      columns: [{ key: "firstName" }],
      filters: [],
    });
    expect(screen.queryByRole("button", { name: /filters/i })).toBeNull();
  });

  it("server tier: emits once on mount with URL-restored params, rows untouched, pager from total", () => {
    const onQueryChange = vi.fn();
    mountTable(
      { total: 100, onQueryChange },
      "page=2&q=ali&f_status=blocked&f_budgetMin=300"
    );

    expect(onQueryChange).toHaveBeenCalledTimes(1);
    const [query, info] = onQueryChange.mock.calls[0] as [
      TableQuery,
      { signal: AbortSignal },
    ];
    expect(query).toMatchObject({
      page: 2,
      limit: 25,
      search: "ali",
      filters: { status: "blocked", budgetMin: 300 },
    });
    expect(info.signal).toBeInstanceOf(AbortSignal);

    // Rows render exactly as given — no client-side filtering on the server
    // tier, even though the URL filters would exclude all three.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();

    // The pager derives from `total`: 100 rows at 25/page, showing page 2.
    expect(screen.getByText("Showing 26–50 of 100")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to page 4" })
    ).toBeInTheDocument();
  });

  it("server tier: changing a filter emits a superseding query and aborts the old signal", () => {
    const seen: { status: unknown; aborted: boolean }[] = [];
    const onQueryChange = (q: TableQuery, info: { signal: AbortSignal }) => {
      seen.push({ status: q.filters.status, aborted: false });
      info.signal.addEventListener("abort", () => {
        seen[seen.length - 1]!.aborted = true;
      });
    };
    mountTable({ total: 100, onQueryChange });

    openFilters();
    pickSelect("Status", "Blocked");

    expect(seen.map((s) => s.status)).toEqual([undefined, "blocked"]);
    expect(seen[0]!.aborted).toBe(true);
    expect(seen[1]!.aborted).toBe(false);
  });

  it("boolean filter writes true and clears", () => {
    const adapter = mountTable();
    openFilters();
    pickSelect("Active", "True");
    expect(param(adapter, "f_active")).toBe("true");
    pickSelect("Active", "Any");
    expect(param(adapter, "f_active")).toBeNull();
  });

  it("text filter writes its key (and empty clears it)", () => {
    const adapter = mountTable();
    openFilters();
    const input = screen.getByLabelText("Value");
    fireEvent.change(input, { target: { value: "car" } });
    expect(param(adapter, "f_firstName")).toBe("car");
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Cara")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });
    expect(param(adapter, "f_firstName")).toBeNull();
  });

  it("multiSelect checkboxes accumulate, uncheck, and clear the array key", () => {
    const adapter = mountTable();
    openFilters();
    const field = screen.getByRole("combobox", { name: "Department" });
    fireEvent.mouseDown(field);
    fireEvent.click(screen.getByRole("option", { name: "Engineering" }));
    expect(param(adapter, "f_department.name")).toBe("Engineering");
    expect(screen.queryByText("Bob")).toBeNull();

    fireEvent.mouseDown(field);
    fireEvent.click(screen.getByRole("option", { name: "Sales" }));
    expect(param(adapter, "f_department.name")).toBe("Engineering,Sales");
    expect(screen.getByText("Bob")).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("button", { name: "Engineering" })).getByTestId(
        "CancelIcon"
      )
    );
    expect(param(adapter, "f_department.name")).toBe("Sales");

    // Removing the last chip writes [] — which clears the key.
    fireEvent.click(
      within(screen.getByRole("button", { name: "Sales" })).getByTestId(
        "CancelIcon"
      )
    );
    expect(param(adapter, "f_department.name")).toBeNull();
  });

  it("range widgets are operator-first with per-flavour localized operators", () => {
    mountTable({ labels: { opAtLeast: "Mindestens" } });
    openFilters();
    // Number flavour: equal / at-least / at-most / between (plus the clear
    // item) — and a `labels` override localizes the list.
    const budgetMenu = openSelect(
      "Operator",
      screen.getByRole("group", { name: "Budget" })
    );
    const budgetOptions = budgetMenu.getAllByRole("option", { hidden: true });
    const budgetOps = budgetOptions.map((option) => option.textContent);
    expect(budgetOps).toEqual([
      "",
      "Equal",
      "Not equal",
      "Greater than",
      "Mindestens",
      "Less than",
      "At most",
      "Between",
      "Is any of",
      "Is none of",
    ]);
    fireEvent.click(budgetOptions[0]!);
    // Date flavour: before / after / on / on-or / between / empty.
    const hiredMenu = openSelect(
      "Operator",
      screen.getByRole("group", { name: "Hired At" })
    );
    const hiredOptions = hiredMenu.getAllByRole("option", { hidden: true });
    const hiredOps = hiredOptions.map((option) => option.textContent);
    expect(hiredOps).toEqual([
      "",
      "Before",
      "After",
      "On",
      "On or after",
      "On or before",
      "Between",
      "Relative",
      "Is empty",
    ]);
    fireEvent.click(hiredOptions[0]!);
    // Operator-first: no value input until a comparison is chosen.
    expect(budgetGroup().queryByLabelText("Value")).toBeNull();
    expect(budgetGroup().queryByLabelText("From")).toBeNull();
  });

  it("dateRange Relative stores the token and exposes last/next N", () => {
    const adapter = mountTable();
    openFilters();
    pickSelect(
      "Operator",
      "Relative",
      screen.getByRole("group", { name: "Hired At" })
    );
    expect(param(adapter, "f_hiredAtOp")).toBe("relative");
    expect(param(adapter, "f_hiredAtFrom")).toBe("today");
    pickSelect(
      "Relative",
      "Last N days",
      screen.getByRole("group", { name: "Hired At" })
    );
    expect(param(adapter, "f_hiredAtFrom")).toBe("last:7");
    fireEvent.change(hiredGroup().getByLabelText("Value"), {
      target: { value: "14" },
    });
    expect(param(adapter, "f_hiredAtFrom")).toBe("last:14");
  });

  it('"At least" writes only Min — switching to "At most" migrates it to Max', () => {
    const adapter = mountTable();
    openFilters();
    pickSelect(
      "Operator",
      "At least",
      screen.getByRole("group", { name: "Budget" })
    );
    fireEvent.change(budgetGroup().getByLabelText("Value"), {
      target: { value: "300" },
    });
    expect(param(adapter, "f_budgetMin")).toBe("300");
    expect(param(adapter, "f_budgetMax")).toBeNull();
    // Budgets >= 300: Bob (900) and Cara (500); Alice (100) drops.
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();

    pickSelect(
      "Operator",
      "At most",
      screen.getByRole("group", { name: "Budget" })
    );
    expect(param(adapter, "f_budgetMin")).toBeNull();
    expect(param(adapter, "f_budgetMax")).toBe("300");
    // The typed bound carried across the comparison switch.
    expect(budgetGroup().getByLabelText("Value")).toHaveValue(300);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it('"Equal" writes BOTH keys with the one value', () => {
    const adapter = mountTable();
    openFilters();
    pickSelect(
      "Operator",
      "Equal",
      screen.getByRole("group", { name: "Budget" })
    );
    fireEvent.change(budgetGroup().getByLabelText("Value"), {
      target: { value: "500" },
    });
    expect(param(adapter, "f_budgetMin")).toBe("500");
    expect(param(adapter, "f_budgetMax")).toBe("500");
    // Only Cara's budget is exactly 500.
    expect(screen.getByText("Cara")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it('"Between" renders From/To and writes both keys', () => {
    const adapter = mountTable();
    openFilters();
    pickSelect(
      "Operator",
      "Between",
      screen.getByRole("group", { name: "Budget" })
    );
    // Two labeled bounds replace the single value input.
    expect(budgetGroup().queryByLabelText("Value")).toBeNull();
    fireEvent.change(budgetGroup().getByLabelText("From"), {
      target: { value: "300" },
    });
    fireEvent.change(budgetGroup().getByLabelText("To"), {
      target: { value: "600" },
    });
    expect(param(adapter, "f_budgetMin")).toBe("300");
    expect(param(adapter, "f_budgetMax")).toBe("600");
    // Only Cara (500) is inside [300, 600].
    expect(screen.getByText("Cara")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
  });

  it("clearing the operator clears the persisted pair", () => {
    const adapter = mountTable();
    openFilters();
    pickSelect(
      "Operator",
      "Between",
      screen.getByRole("group", { name: "Budget" })
    );
    fireEvent.change(budgetGroup().getByLabelText("From"), {
      target: { value: "300" },
    });
    fireEvent.change(budgetGroup().getByLabelText("To"), {
      target: { value: "600" },
    });
    expect(param(adapter, "f_budgetMin")).toBe("300");
    pickSelect("Operator", null, screen.getByRole("group", { name: "Budget" }));
    expect(param(adapter, "f_budgetMin")).toBeNull();
    expect(param(adapter, "f_budgetMax")).toBeNull();
    expect(budgetGroup().queryByLabelText("From")).toBeNull();
    // Every row is back once the pair clears.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Cara")).toBeInTheDocument();
  });

  it("URL f_budgetMin=5&f_budgetMax=5 mounts as Equal with the one value", () => {
    mountTable({}, "f_budgetMin=5&f_budgetMax=5");
    openFilters();
    expect(
      budgetGroup().getByRole("combobox", { name: "Operator" })
    ).toHaveTextContent("Equal");
    expect(budgetGroup().getByLabelText("Value")).toHaveValue(5);
    // The restored pair predicate applied on mount: no budget equals 5.
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.queryByText("Bob")).toBeNull();
    expect(screen.queryByText("Cara")).toBeNull();
    expect(
      screen.getByText("No results match your filters")
    ).toBeInTheDocument();
  });

  it("dateRange: On-or-after writes From; Between adds To; chips per bound", () => {
    const adapter = mountTable();
    openFilters();
    pickSelect(
      "Operator",
      "On or after",
      screen.getByRole("group", { name: "Hired At" })
    );
    fireEvent.change(hiredGroup().getByLabelText("Value"), {
      target: { value: "2025-03-01" },
    });
    expect(param(adapter, "f_hiredAtFrom")).toBe("2025-03-01");
    expect(param(adapter, "f_hiredAtTo")).toBeNull();
    // Alice (2025-01-15) hires before the bound.
    expect(screen.queryByText("Alice")).toBeNull();

    pickSelect(
      "Operator",
      "Between",
      screen.getByRole("group", { name: "Hired At" })
    );
    // The single value carried over as the lower bound.
    expect(param(adapter, "f_hiredAtFrom")).toBe("2025-03-01");
    fireEvent.change(hiredGroup().getByLabelText("To"), {
      target: { value: "2025-12-31" },
    });
    expect(param(adapter, "f_hiredAtTo")).toBe("2025-12-31");
    // Only Bob (2025-06-01) hires inside the window.
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Cara")).toBeNull();
    // Two chips, one per bound — the pair contract is unchanged.
    expect(screen.getByText("Hired At ≥ 2025-03-01")).toBeInTheDocument();
    expect(screen.getByText("Hired At ≤ 2025-12-31")).toBeInTheDocument();
  });
});

describe("<AutoFilterForm> (MUI)", () => {
  it("renders a custom type through the registry widget kind", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = resolveFilterRegistry([{ ...text, type: "personText" }]);
    renderMui(
      <AutoFilterForm
        defs={[
          {
            key: "name",
            type: "personText",
            label: "Name",
            placeholder: "Find…",
          },
        ]}
        source={{ extra: {}, setExtra: vi.fn(), setExtras: vi.fn() }}
        labels={defaultLabels}
        registry={registry}
      />
    );
    expect(screen.getByPlaceholderText("Find…")).toBeVisible();
  });

  it("checklist hides without allFilteredRows and checks a counted value", () => {
    const setExtra = vi.fn();
    const source = {
      extra: {},
      setExtra,
      setExtras: vi.fn(),
    };
    renderMui(
      <AutoFilterForm
        defs={[{ key: "team", type: "checklist", getValue: () => "Core" }]}
        source={source}
        labels={defaultLabels}
      />
    );
    expect(screen.queryByLabelText("Search values")).toBeNull();
    renderMui(
      <AutoFilterForm
        defs={[{ key: "team", type: "checklist", getValue: () => "Core" }]}
        source={{ ...source, allFilteredRows: [{ id: "1" } as Person] }}
        labels={defaultLabels}
      />
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(setExtra).toHaveBeenCalledWith("team", ["Core"]);
  });

  it("async select options load lazily: disabled placeholder, then choices", async () => {
    let resolveOptions!: (options: readonly FilterOption[]) => void;
    const load = vi.fn(
      () =>
        new Promise<readonly FilterOption[]>((resolve) => {
          resolveOptions = resolve;
        })
    );
    const adapter = mountTable({
      columns: [{ key: "firstName" }],
      filters: [{ key: "status", type: "select", options: load }],
    });
    openFilters();
    // While the loader is in flight: the All reset plus one disabled "…" row.
    const menu = openSelect("Status");
    expect(
      menu.getByRole("option", { name: "…", hidden: true })
    ).toHaveAttribute("aria-disabled", "true");
    await act(async () => {
      resolveOptions([{ value: "active", label: "Active" }]);
      await Promise.resolve();
    });
    const active = await screen.findByRole("option", {
      name: "Active",
      hidden: true,
    });
    expect(
      screen.queryByRole("option", { name: "…", hidden: true })
    ).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    // The loaded choices write filter state like any static option list.
    fireEvent.click(active);
    expect(param(adapter, "f_status")).toBe("active");
  });

  it("async multiSelect options show a spinner while loading, then checkboxes", async () => {
    let resolveOptions!: (options: readonly FilterOption[]) => void;
    const adapter = mountTable({
      columns: [{ key: "firstName" }],
      filters: [
        {
          key: "department.name",
          type: "multiSelect",
          label: "Department",
          options: () =>
            new Promise<readonly FilterOption[]>((resolve) => {
              resolveOptions = resolve;
            }),
        },
      ],
    });
    openFilters();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Engineering" })).toBeNull();

    await act(async () => {
      resolveOptions([{ value: "Engineering", label: "Engineering" }]);
      // Let the loader's .then handlers run before asserting.
      await Promise.resolve();
    });
    // The spinner has to go away, not just be replaced beside: a progressbar
    // that outlives its load reads as a table still working, forever.
    expect(screen.queryByRole("progressbar")).toBeNull();
    const field = screen.getByRole("combobox", { name: "Department" });
    fireEvent.mouseDown(field);
    fireEvent.click(screen.getByRole("option", { name: "Engineering" }));
    expect(param(adapter, "f_department.name")).toBe("Engineering");
  });

  it("renders option-less select and multiSelect without choices", () => {
    const setExtra = vi.fn();
    renderMui(
      <AutoFilterForm<Person>
        defs={[
          { key: "status", type: "select" },
          { key: "department.name", type: "multiSelect", label: "Department" },
        ]}
        source={{ extra: {}, setExtra, setExtras: vi.fn() }}
        labels={defaultLabels}
      />
    );
    // The select still offers the "All" reset option…
    const statusMenu = openSelect("Status");
    const all = statusMenu.getByRole("option", {
      name: "All",
      hidden: true,
    });
    expect(all).toBeInTheDocument();
    fireEvent.click(all);
    // …and the option-less Autocomplete is there with no choices.
    expect(
      screen.getByRole("combobox", { name: "Department" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("urlSync={false} keeps state in memory and never touches the adapter", () => {
    const spy = {
      getSearch: vi.fn(() => ""),
      setSearch: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    };
    mountTable({ urlAdapter: spy, urlSync: false });
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(spy.getSearch).not.toHaveBeenCalled();
    expect(spy.setSearch).not.toHaveBeenCalled();
    expect(spy.subscribe).not.toHaveBeenCalled();
  });
});
