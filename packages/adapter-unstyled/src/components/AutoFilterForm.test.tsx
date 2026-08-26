import type { ExtraFilters, FilterOption, TableSource } from "@adapttable/core";
import { defaultFilterRegistry, resolveFilterRegistry } from "@adapttable/core";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AutoFilterForm } from "./AutoFilterForm";

interface Row {
  id: string;
}

function stubSource(extra: ExtraFilters, allFilteredRows?: readonly Row[]) {
  const setExtra = vi.fn();
  const setExtras = vi.fn();
  const source: TableSource<Row> = {
    rows: [],
    allFilteredRows,
    total: 0,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: () => undefined,
    error: null,
    paginationMode: "paged",
    page: 1,
    limit: 25,
    defaultLimit: 25,
    search: "",
    sortBy: undefined,
    sortDir: undefined,
    groupBy: undefined,
    sortLevels: [],
    toggleSortLevel: () => undefined,
    extra,
    setPage: () => undefined,
    setLimit: () => undefined,
    setSort: () => undefined,
    setGroupBy: () => undefined,
    setSearch: () => undefined,
    setExtra,
    setExtras,
    clearExtras: () => undefined,
    clearAll: () => undefined,
  };
  return { source, setExtra, setExtras };
}

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

/** A controllable async option source: resolve it mid-test, act-wrapped. */
function deferredLoader() {
  let resolve!: (value: readonly FilterOption[]) => void;
  const loader = () =>
    new Promise<readonly FilterOption[]>((res) => {
      resolve = res;
    });
  const resolveWith = (value: readonly FilterOption[]) =>
    act(async () => {
      resolve(value);
      await Promise.resolve();
    });
  return { loader, resolveWith };
}

describe("<AutoFilterForm> standalone", () => {
  it("multiSelect tolerates a scalar bag value and toggles around it", () => {
    const { source, setExtra } = stubSource({ tags: "a" });
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "tags", type: "multiSelect", options: OPTIONS }]}
        source={source}
      />
    );
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Beta" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));
    expect(setExtra).toHaveBeenCalledWith("tags", ["a", "b"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Alpha" }));
    expect(setExtra).toHaveBeenCalledWith("tags", []);
  });

  it("checklist hides without allFilteredRows and checks a counted value", () => {
    const hidden = stubSource({});
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "team", type: "checklist", getValue: () => "Core" }]}
        source={hidden.source}
      />
    );
    expect(screen.queryByLabelText("Search values")).toBeNull();
    const { source, setExtra } = stubSource({}, [{ id: "1" }]);
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "team", type: "checklist", getValue: () => "Core" }]}
        source={source}
      />
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(setExtra).toHaveBeenCalledWith("team", ["Core"]);
  });

  it("boolean: tri-state select writes true / false / clears", () => {
    const { source, setExtra } = stubSource({});
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "core", type: "boolean", label: "Core team" }]}
        source={source}
      />
    );
    const select = screen.getByLabelText("Core team");
    expect(select).toHaveValue("");
    fireEvent.change(select, { target: { value: "true" } });
    expect(setExtra).toHaveBeenCalledWith("core", "true");
    fireEvent.change(select, { target: { value: "" } });
    expect(setExtra).toHaveBeenCalledWith("core", undefined);
  });

  it("treats an empty-string bag value as nothing selected and renders option-less groups", () => {
    const { source } = stubSource({ tags: "" });
    render(
      <AutoFilterForm<Row>
        defs={[
          { key: "tags", type: "multiSelect", options: OPTIONS },
          // No options declared → just the captioned (humanized) group.
          { key: "bare", type: "multiSelect" },
        ]}
        source={source}
      />
    );
    expect(screen.getByRole("checkbox", { name: "Alpha" })).not.toBeChecked();
    expect(screen.getByText("Bare")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("select: async options render a single disabled placeholder, then the choices", async () => {
    const { source } = stubSource({});
    const { loader, resolveWith } = deferredLoader();
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "city", type: "select", options: loader }]}
        source={source}
      />
    );
    const select = screen.getByRole("combobox", { name: "City" });
    // While the loader is in flight: exactly one disabled "…" option.
    const placeholder = within(select).getByRole("option", { name: "…" });
    expect(placeholder).toBeDisabled();
    expect(within(select).getAllByRole("option")).toHaveLength(1);

    await resolveWith(OPTIONS);
    // Loaded: the "All" choice plus the resolved options replace it.
    expect(within(select).getAllByRole("option")).toHaveLength(3);
    expect(
      within(select).getByRole("option", { name: "Alpha" })
    ).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "…" })).toBeNull();
  });

  it("multiSelect: async options render the loading hook, then checkboxes", async () => {
    const { source } = stubSource({});
    const { loader, resolveWith } = deferredLoader();
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "tags", type: "multiSelect", options: loader }]}
        source={source}
        classNames={{ filterOptionsLoading: "c-loading" }}
      />
    );
    // While loading: no checkboxes, just the classed loading placeholder.
    const loading = document.querySelector(
      '[data-adapttable-part="filter-options-loading"]'
    );
    expect(loading).toHaveClass("c-loading");
    expect(loading).toHaveTextContent("…");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);

    await resolveWith(OPTIONS);
    expect(
      document.querySelector('[data-adapttable-part="filter-options-loading"]')
    ).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Beta" })).toBeInTheDocument();
  });

  it("range: a lone upper bound mounts as At most showing THAT bound, and an operator switch re-maps it", () => {
    const { source, setExtras } = stubSource({ ageMax: "9" });
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "age", type: "numberRange" }]}
        source={source}
      />
    );
    const operator = screen.getByRole("combobox", { name: "Operator" });
    expect(operator).toHaveValue("lte");
    // The single input shows the bound the operator owns — the upper one.
    expect(screen.getByLabelText("Value")).toHaveValue(9);
    // Switching to "At least" carries the value onto the lower bound.
    fireEvent.change(operator, { target: { value: "gte" } });
    expect(setExtras).toHaveBeenCalledWith({
      ageMin: "9",
      ageMax: undefined,
      ageOp: "gte",
    });
  });

  it("range: each Between input patches only its own bound (empty clears it)", () => {
    const { source, setExtras } = stubSource({ ageMin: "2", ageMax: "9" });
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "age", type: "numberRange" }]}
        source={source}
      />
    );
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "12" } });
    expect(setExtras).toHaveBeenCalledWith({
      ageMin: "2",
      ageMax: "12",
      ageOp: "between",
    });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "" } });
    expect(setExtras).toHaveBeenCalledWith({
      ageMin: undefined,
      ageMax: "9",
      ageOp: "between",
    });
  });

  it("range: dateRange uses From/To state keys and the date input type", () => {
    const { source, setExtras } = stubSource({});
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "hiredAt", type: "dateRange" }]}
        source={source}
      />
    );
    // Nothing persisted → the operator placeholder and no value inputs yet.
    const operator = screen.getByRole("combobox", { name: "Operator" });
    expect(operator).toHaveValue("");
    expect(screen.queryByLabelText("Value")).toBeNull();
    fireEvent.change(operator, { target: { value: "lte" } });
    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: undefined,
      hiredAtTo: undefined,
      hiredAtOp: undefined,
    });
    const input = screen.getByLabelText("Value");
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveAttribute("placeholder", "Value");
    fireEvent.change(input, { target: { value: "2026-01-01" } });
    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: undefined,
      hiredAtTo: "2026-01-01",
      hiredAtOp: "lte",
    });
  });

  it("renders a custom type through the registry widget kind", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = resolveFilterRegistry([{ ...text, type: "personText" }]);
    const { source } = stubSource({});
    render(
      <AutoFilterForm<Row>
        defs={[
          {
            key: "name",
            type: "personText",
            label: "Name",
            placeholder: "Find…",
          },
        ]}
        source={source}
        registry={registry}
      />
    );
    expect(screen.getByPlaceholderText("Find…")).toBeVisible();
  });

  it("prefers a spec.render over the kit widget", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = resolveFilterRegistry([
      {
        ...text,
        type: "custom",
        render: () => <button type="button">Custom widget</button>,
      },
    ]);
    const { source } = stubSource({});
    render(
      <AutoFilterForm<Row>
        defs={[{ key: "name", type: "custom", label: "Name" }]}
        source={source}
        registry={registry}
      />
    );
    expect(screen.getByRole("button", { name: "Custom widget" })).toBeVisible();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
