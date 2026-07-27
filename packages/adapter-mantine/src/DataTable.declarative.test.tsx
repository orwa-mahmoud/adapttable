import { createMemoryAdapter } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Person {
  id: string;
  name: string;
  status: string;
  budget: number;
  department: { name: string };
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Alpha",
    status: "active",
    budget: 100,
    department: { name: "Platform" },
  },
  {
    id: "2",
    name: "Beta",
    status: "archived",
    budget: 900,
    department: { name: "Design" },
  },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const FILTERABLE_COLUMNS: ColumnDef<Person>[] = [
  { key: "name" },
  { key: "status", filter: { type: "select", options: STATUS_OPTIONS } },
];

const renderMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

/**
 * Open the Filters popover and return its card. The dropdown stays
 * visibility-hidden in jsdom (Floating UI never positions it), so anchor on
 * a label rendered inside it and walk up — the established pattern for
 * Mantine dropdowns in this suite. A bare `.mantine-Popover-dropdown` query
 * would also match the inline page-size Select's combobox.
 */
async function openFiltersPopover(anchorLabel: string): Promise<HTMLElement> {
  fireEvent.click(screen.getByRole("button", { name: /filters/i }));
  const anchor = await screen.findByText(anchorLabel);
  const dropdown = anchor.closest(".mantine-Popover-dropdown");
  expect(dropdown).not.toBeNull();
  return dropdown as HTMLElement;
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("<DataTable> declarative columns + filters (Mantine)", () => {
  it("locale + column i18n: cells, sort and filter follow the Arabic field", () => {
    interface LPerson {
      id: string;
      nameEn: string;
      nameAr: string;
    }
    const L_PEOPLE: LPerson[] = [
      { id: "1", nameEn: "Beta", nameAr: "بيتا" },
      { id: "2", nameEn: "Alpha", nameAr: "ألفا" },
    ];
    const adapter = createMemoryAdapter("f_nameEn=بيتا");
    renderMantine(
      <DataTable<LPerson>
        data={L_PEOPLE}
        locale="ar"
        columns={[
          {
            key: "nameEn",
            header: "الاسم",
            i18n: { ar: "nameAr" },
            sortable: true,
            filter: "text",
          },
        ]}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        forceMobile={false}
      />
    );
    // The cell shows the Arabic field, and the URL-restored text filter
    // matched against it (بيتا ⊂ nameAr of row 1 only).
    expect(screen.getByText("بيتا")).toBeInTheDocument();
    expect(screen.queryByText("ألفا")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("column filter shorthands alone (no filters prop) render the auto form", async () => {
    const adapter = createMemoryAdapter("");
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={[
          { key: "name" },
          {
            key: "status",
            filter: { type: "select", options: STATUS_OPTIONS },
          },
        ]}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        forceMobile={false}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));
    expect(await screen.findByLabelText("Status")).toBeInTheDocument();
  });

  it("zero ceremony: the auto-built select filters rows, raises a chip, and clear-all resets", async () => {
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={FILTERABLE_COLUMNS}
        filters={[{ key: "budget", type: "numberRange" }]}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter()}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    // The range shows ONE visible group label; the widget is operator-first.
    const dropdown = await openFiltersPopover("Budget");
    // The form carries one control per definition: the column's select and
    // the standalone numberRange's operator select (no value input until an
    // operator is chosen).
    // Both the combobox input and its options list carry the aria-label, so
    // scope the query to the input element.
    expect(
      within(dropdown).getByLabelText("Budget Operator", { selector: "input" })
    ).toBeInTheDocument();
    expect(
      within(dropdown).queryByLabelText("Budget Value", { selector: "input" })
    ).toBeNull();

    fireEvent.change(within(dropdown).getByLabelText("Status"), {
      target: { value: "active" },
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).toBeNull();
    // The chip uses the derived "<label>: <option label>" resolver.
    expect(screen.getByText("Status: Active")).toBeInTheDocument();

    const clearAll = [...dropdown.querySelectorAll("button")].find(
      (b) => b.textContent === "Clear all"
    )!;
    fireEvent.click(clearAll);
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Status: Active")).toBeNull();
  });

  it("numberRange definitions parse the URL as numbers and filter the frontend tier", () => {
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={FILTERABLE_COLUMNS}
        filters={[{ key: "budget", type: "numberRange" }]}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("f_budgetMin=500")}
      />
    );
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Budget ≥ 500")).toBeInTheDocument();
  });

  it("auto-derives the header from the column key", () => {
    renderMantine(
      <DataTable
        data={[{ id: "1", firstName: "Ada" }]}
        columns={[{ key: "firstName" }]}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter()}
      />
    );
    expect(screen.getByText("First Name")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("renders nested values via dot-path column keys", () => {
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={[{ key: "name" }, { key: "department.name" }]}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter()}
      />
    );
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("server tier: emits one consolidated query on mount and renders rows as-is", () => {
    const onQueryChange = vi.fn();
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        total={37}
        onQueryChange={onQueryChange}
        columns={FILTERABLE_COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("page=2&q=al&f_status=active")}
      />
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(onQueryChange).toHaveBeenCalledWith(
      {
        page: 2,
        limit: 25,
        search: "al",
        sortBy: undefined,
        sortDir: undefined,
        sortLevels: [],
        filters: { status: "active" },
      },
      { signal: expect.any(AbortSignal) }
    );
    // No client filtering on the server tier: the archived row stays even
    // though the URL carries f_status=active.
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    // The pager reflects the server total (37 rows / 25 per page).
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("an empty declarative filters array renders no Filters affordance", () => {
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={[{ key: "name" }]}
        filters={[]}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter()}
      />
    );
    expect(screen.queryByRole("button", { name: /filters/i })).toBeNull();
  });

  it("caller filterLabels win over the derived chip resolver per key", () => {
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={FILTERABLE_COLUMNS}
        filterLabels={{ status: (v) => `State → ${v}` }}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("f_status=active")}
      />
    );
    // Column-level filter shorthands still drive the frontend predicate…
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).toBeNull();
    // …but the caller's resolver labels the chip.
    expect(screen.getByText("State → active")).toBeInTheDocument();
    expect(screen.queryByText("Status: Active")).toBeNull();
  });

  it("urlKey namespaces the table's URL params", () => {
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={FILTERABLE_COLUMNS}
        rowKey={(r) => r.id}
        urlKey="t"
        urlAdapter={createMemoryAdapter("t.f_status=archived")}
      />
    );
    expect(screen.queryByText("Alpha")).toBeNull();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("urlSync={false} keeps state in memory and never touches the adapter", () => {
    const spy = {
      getSearch: vi.fn(() => ""),
      setSearch: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
    };
    renderMantine(
      <DataTable<Person>
        data={PEOPLE}
        columns={FILTERABLE_COLUMNS}
        rowKey={(r) => r.id}
        urlAdapter={spy}
        urlSync={false}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(spy.getSearch).not.toHaveBeenCalled();
    expect(spy.setSearch).not.toHaveBeenCalled();
    expect(spy.subscribe).not.toHaveBeenCalled();
  });
});
