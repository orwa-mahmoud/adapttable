import {
  defaultFilterRegistry,
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  type FilterOption,
  resolveFilterRegistry,
} from "@adapttable/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  AutoFilterForm,
  type RangeFilterLabels,
} from "./components/AutoFilterForm";

/** A promise of options whose resolution the test controls. */
function deferredOptions() {
  let resolve: (options: readonly FilterOption[]) => void = () => undefined;
  const promise = new Promise<readonly FilterOption[]>((res) => {
    resolve = res;
  });
  return { loader: () => promise, resolve };
}

const roleDefs: FilterDef<unknown>[] = [
  {
    key: "role",
    type: "multiSelect",
    options: [{ value: "admin", label: "Admin" }],
  },
];

const BUDGET: FilterDef<unknown>[] = [{ key: "budget", type: "numberRange" }];
const SHIPPED: FilterDef<unknown>[] = [{ key: "shipped", type: "dateRange" }];

/** A static source for the non-range controls (they write via `setExtra`). */
function staticSource(extra: ExtraFilters) {
  return { extra, setExtra: vi.fn(), setExtras: vi.fn() };
}

interface RangeHarnessProps {
  defs: FilterDef<unknown>[];
  initial?: ExtraFilters;
  /** Observes every `setExtras` patch the widget commits. */
  onPatch?: (updates: ExtraFilters) => void;
  labels?: RangeFilterLabels;
}

/**
 * A stateful host applying `setExtras` patches back into the extra bag,
 * the way the real table state does — so multi-step range interactions
 * (pick operator, fill From, fill To) see their own writes.
 */
function RangeHarness({
  defs,
  initial = {},
  onPatch,
  labels = defaultLabels,
}: Readonly<RangeHarnessProps>) {
  const [extra, setExtra] = useState<ExtraFilters>(initial);
  return (
    <AutoFilterForm
      defs={defs}
      labels={labels}
      source={{
        extra,
        setExtra: () => undefined,
        setExtras: (updates) => {
          onPatch?.(updates);
          setExtra((prev) => ({ ...prev, ...updates }));
        },
      }}
    />
  );
}

/** Open one range widget's operator dropdown by its accessible name. */
function openOperator(name: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name }));
}

/** Pick an option from Ant Design's composite Select. */
function pickSelect(name: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name }));
  fireEvent.click(screen.getByTitle(option));
}

describe("<AutoFilterForm> (Ant Design)", () => {
  it("checklist hides without allFilteredRows and checks a counted value", () => {
    render(
      <AutoFilterForm
        defs={[{ key: "team", type: "checklist", getValue: () => "Core" }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    expect(screen.queryByLabelText("Search values")).toBeNull();
    const source = {
      ...staticSource({}),
      allFilteredRows: [{ id: "1" }],
    };
    render(
      <AutoFilterForm
        defs={[{ key: "team", type: "checklist", getValue: () => "Core" }]}
        source={source}
        labels={defaultLabels}
      />
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(source.setExtra).toHaveBeenCalledWith("team", ["Core"]);
  });

  it("boolean: tri-state select writes true and clears", () => {
    const write = vi.fn();
    function Harness() {
      const [extra, setExtra] = useState<ExtraFilters>({});
      return (
        <AutoFilterForm
          defs={[{ key: "core", type: "boolean", label: "Core team" }]}
          source={{
            extra,
            setExtra: (key, value) => {
              write(key, value);
              setExtra((current) => ({ ...current, [key]: value }));
            },
            setExtras: vi.fn(),
          }}
          labels={defaultLabels}
        />
      );
    }
    render(<Harness />);
    pickSelect("Core team", defaultLabels.boolTrue);
    expect(write).toHaveBeenCalledWith("core", "true");
    pickSelect("Core team", defaultLabels.boolAny);
    expect(write).toHaveBeenCalledWith("core", undefined);
  });

  it("tolerates a scalar multiSelect value (treats it as one selection)", () => {
    render(
      <AutoFilterForm
        defs={roleDefs}
        source={staticSource({ role: "admin" })}
        labels={defaultLabels}
      />
    );
    expect(screen.getByTitle("Admin")).toBeInTheDocument();
  });

  it("treats an empty-string multiSelect value as nothing selected", () => {
    render(
      <AutoFilterForm
        defs={roleDefs}
        source={staticSource({ role: "" })}
        labels={defaultLabels}
      />
    );
    expect(document.querySelector(".ant-select-selection-item")).toBeNull();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Role" }));
    expect(screen.getByTitle("Admin")).toBeInTheDocument();
  });

  it("renders only the All option for a select without options", () => {
    render(
      <AutoFilterForm
        defs={[{ key: "city", type: "select" }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "City" }));
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    const visibleOptions = document.querySelectorAll(".ant-select-item-option");
    expect(visibleOptions).toHaveLength(1);
    expect(visibleOptions[0]).toHaveTextContent("All");
  });

  it("renders an options-less multiSelect as an empty group", () => {
    const { container } = render(
      <AutoFilterForm
        defs={[{ key: "role", type: "multiSelect" }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      0
    );
  });

  it("shows the kit loading state while async select options load, then the loaded options", async () => {
    const { loader, resolve } = deferredOptions();
    render(
      <AutoFilterForm
        defs={[{ key: "city", type: "select", options: loader }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    const select = screen
      .getByRole("combobox", { name: "City" })
      .closest(".ant-select");
    expect(select).toHaveClass("ant-select-loading");

    await act(async () => {
      resolve([{ value: "dxb", label: "Dubai" }]);
      await Promise.resolve();
    });
    expect(select).not.toHaveClass("ant-select-loading");
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "City" }));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getByTitle("Dubai")).toBeInTheDocument();
  });

  it("shows a small spinner while async multiSelect options load, then the checkboxes", async () => {
    const { loader, resolve } = deferredOptions();
    render(
      <AutoFilterForm
        defs={[{ key: "role", type: "multiSelect", options: loader }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    const select = screen
      .getByRole("combobox", { name: "Role" })
      .closest(".ant-select");
    // Busy, and saying so in the kit's own way — the same assertion the
    // single-select case above makes.
    expect(select).toHaveClass("ant-select-loading");
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Role" }));
    expect(screen.queryByTitle("Admin")).toBeNull();

    await act(async () => {
      resolve([{ value: "admin", label: "Admin" }]);
      await Promise.resolve();
    });
    expect(select).not.toHaveClass("ant-select-loading");
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Role" }));
    expect(screen.getByTitle("Admin")).toBeInTheDocument();
  });
});

describe("<AutoFilterForm> operator-first range widgets (Ant Design)", () => {
  it("lists the number operators with the caller's localized labels", () => {
    render(
      <RangeHarness
        defs={BUDGET}
        labels={{
          ...defaultLabels,
          operator: "Vergleich",
          opEqual: "Gleich",
          opAtLeast: "Mindestens",
          opAtMost: "Höchstens",
          opBetween: "Zwischen",
        }}
      />
    );
    openOperator("Budget Vergleich");
    for (const op of ["Gleich", "Mindestens", "Höchstens", "Zwischen"]) {
      expect(screen.getByTitle(op)).toBeInTheDocument();
    }
    // Number flavour: none of the date wordings appear.
    expect(screen.queryByTitle("On or after")).toBeNull();
  });

  it("lists the date operator wordings for a dateRange", () => {
    render(<RangeHarness defs={SHIPPED} />);
    openOperator("Shipped Operator");
    for (const op of [
      "Before",
      "After",
      "On",
      "On or after",
      "On or before",
      "Between",
      "Relative",
      "Is empty",
    ]) {
      expect(screen.getByTitle(op)).toBeInTheDocument();
    }
    expect(screen.queryByTitle("At least")).toBeNull();
  });

  it('"At least" plus one value writes only the Min key', () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(<RangeHarness defs={BUDGET} onPatch={onPatch} />);
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("At least"));
    // Choosing an operator alone persists nothing yet — both keys cleared.
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: undefined,
      budgetMax: undefined,
    });
    fireEvent.change(screen.getByLabelText("Budget Value"), {
      target: { value: "30" },
    });
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: "30",
      budgetMax: undefined,
      budgetOp: "gte",
    });
  });

  it('"Equal" mirrors the single value into BOTH keys', () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(<RangeHarness defs={BUDGET} onPatch={onPatch} />);
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("Equal"));
    fireEvent.change(screen.getByLabelText("Budget Value"), {
      target: { value: "5" },
    });
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: "5",
      budgetMax: "5",
      budgetOp: "eq",
    });
  });

  it('"Between" swaps in a labeled From/To pair writing both bounds', () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(<RangeHarness defs={BUDGET} onPatch={onPatch} />);
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("Between"));
    expect(screen.queryByLabelText("Budget Value")).toBeNull();
    fireEvent.change(screen.getByLabelText("Budget From"), {
      target: { value: "10" },
    });
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: "10",
      budgetMax: undefined,
    });
    fireEvent.change(screen.getByLabelText("Budget To"), {
      target: { value: "20" },
    });
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: "10",
      budgetMax: "20",
      budgetOp: "between",
    });
  });

  it("mounts Equal from a matching (numeric) pair and allowClear clears it", () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(
      <RangeHarness
        defs={BUDGET}
        initial={{ budgetMin: 5, budgetMax: 5 }}
        onPatch={onPatch}
      />
    );
    // Persisted equal bounds read back as Equal + the mirrored value.
    expect(screen.getByTitle("Equal")).toBeInTheDocument();
    expect(screen.getByLabelText("Budget Value")).toHaveValue("5");
    // antd 6.6 makes the clear control a real button that names itself, so it
    // is reachable by role and answers a click rather than a raw mousedown.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: undefined,
      budgetMax: undefined,
    });
    expect(screen.queryByLabelText("Budget Value")).toBeNull();
  });

  it("mounts At most from an upper-bound-only bag and rewrites only Max", () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(
      <RangeHarness
        defs={BUDGET}
        initial={{ budgetMax: "40" }}
        onPatch={onPatch}
      />
    );
    expect(screen.getByTitle("At most")).toBeInTheDocument();
    const value = screen.getByLabelText("Budget Value");
    expect(value).toHaveValue("40");
    fireEvent.change(value, { target: { value: "45" } });
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: undefined,
      budgetMax: "45",
      budgetOp: "lte",
    });
  });

  it("carries the entered value across comparison changes", () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(
      <RangeHarness
        defs={BUDGET}
        initial={{ budgetMin: "30" }}
        onPatch={onPatch}
      />
    );
    // Mounted as "At least 30"; Between copies that value into both bounds.
    expect(screen.getByTitle("At least")).toBeInTheDocument();
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("Between"));
    expect(screen.getByLabelText("Budget From")).toHaveValue("30");
    expect(screen.getByLabelText("Budget To")).toHaveValue("30");
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: "30",
      budgetMax: "30",
      budgetOp: "between",
    });
    // …and a single-value comparison takes the lower bound with it.
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("At most"));
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      budgetMin: undefined,
      budgetMax: "30",
      budgetOp: "lte",
    });
    expect(screen.getByLabelText("Budget Value")).toHaveValue("30");
  });

  it("renders a custom type through the registry widget kind", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = resolveFilterRegistry([{ ...text, type: "personText" }]);
    render(
      <AutoFilterForm
        defs={[
          {
            key: "name",
            type: "personText",
            label: "Name",
            placeholder: "Find…",
          },
        ]}
        source={staticSource({})}
        labels={defaultLabels}
        registry={registry}
      />
    );
    expect(screen.getByPlaceholderText("Find…")).toBeVisible();
  });

  it("dateRange keeps the native date input for the single value", () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(<RangeHarness defs={SHIPPED} onPatch={onPatch} />);
    openOperator("Shipped Operator");
    fireEvent.click(screen.getByTitle("On or after"));
    const input = screen.getByLabelText<HTMLInputElement>("Shipped Value");
    expect(input.type).toBe("date");
    fireEvent.change(input, { target: { value: "2026-01-01" } });
    expect(onPatch.mock.lastCall?.[0]).toMatchObject({
      shippedFrom: "2026-01-01",
      shippedTo: undefined,
      shippedOp: "gte",
    });
  });
});
