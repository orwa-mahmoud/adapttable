import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  type FilterOption,
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

describe("<AutoFilterForm> (Ant Design)", () => {
  it("tolerates a scalar multiSelect value (treats it as one selection)", () => {
    render(
      <AutoFilterForm
        defs={roleDefs}
        source={staticSource({ role: "admin" })}
        labels={defaultLabels}
      />
    );
    expect(screen.getByRole("checkbox", { name: "Admin" })).toBeChecked();
  });

  it("treats an empty-string multiSelect value as nothing selected", () => {
    render(
      <AutoFilterForm
        defs={roleDefs}
        source={staticSource({ role: "" })}
        labels={defaultLabels}
      />
    );
    expect(screen.getByRole("checkbox", { name: "Admin" })).not.toBeChecked();
  });

  it("renders only the All option for a select without options", () => {
    render(
      <AutoFilterForm
        defs={[{ key: "city", type: "select" }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    const select = screen.getByLabelText<HTMLSelectElement>("City");
    expect(select.options).toHaveLength(1);
    expect(select.options[0]).toHaveTextContent("All");
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

  it("shows a disabled placeholder option while async select options load, then the loaded options", async () => {
    const { loader, resolve } = deferredOptions();
    render(
      <AutoFilterForm
        defs={[{ key: "city", type: "select", options: loader }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    // While the loader is in flight: "All" plus one disabled "…" option.
    const select = screen.getByLabelText<HTMLSelectElement>("City");
    expect(select.options).toHaveLength(2);
    expect(select.options[1]).toBeDisabled();
    expect(select.options[1]).toHaveTextContent("…");

    await act(async () => {
      resolve([{ value: "dxb", label: "Dubai" }]);
      await Promise.resolve();
    });
    expect(select.options).toHaveLength(2);
    expect(select.options[1]).toHaveTextContent("Dubai");
    expect(select.options[1]).not.toBeDisabled();
    expect(select.options[1]).toHaveValue("dxb");
  });

  it("shows a small spinner while async multiSelect options load, then the checkboxes", async () => {
    const { loader, resolve } = deferredOptions();
    const { container } = render(
      <AutoFilterForm
        defs={[{ key: "role", type: "multiSelect", options: loader }]}
        source={staticSource({})}
        labels={defaultLabels}
      />
    );
    expect(container.querySelector(".ant-spin")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();

    await act(async () => {
      resolve([{ value: "admin", label: "Admin" }]);
      await Promise.resolve();
    });
    expect(container.querySelector(".ant-spin")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Admin" })).toBeInTheDocument();
  });
});

describe("<AutoFilterForm> operator-first range widgets (Ant Design)", () => {
  it("lists the four number operators with the caller's localized labels", () => {
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
    for (const op of ["On", "On or after", "On or before", "Between"]) {
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
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: undefined,
      budgetMax: undefined,
    });
    fireEvent.change(screen.getByLabelText("Budget Value"), {
      target: { value: "30" },
    });
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: "30",
      budgetMax: undefined,
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
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: "5",
      budgetMax: "5",
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
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: "10",
      budgetMax: undefined,
    });
    fireEvent.change(screen.getByLabelText("Budget To"), {
      target: { value: "20" },
    });
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: "10",
      budgetMax: "20",
    });
  });

  it("mounts Equal from a matching (numeric) pair and allowClear clears it", () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    const { container } = render(
      <RangeHarness
        defs={BUDGET}
        initial={{ budgetMin: 5, budgetMax: 5 }}
        onPatch={onPatch}
      />
    );
    // Persisted equal bounds read back as Equal + the mirrored value.
    expect(screen.getByTitle("Equal")).toBeInTheDocument();
    expect(screen.getByLabelText("Budget Value")).toHaveValue("5");
    fireEvent.mouseDown(container.querySelector(".ant-select-clear")!);
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
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
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: undefined,
      budgetMax: "45",
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
    // Mounted as "At least 30"; Between keeps 30 as the lower bound.
    expect(screen.getByTitle("At least")).toBeInTheDocument();
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("Between"));
    expect(screen.getByLabelText("Budget From")).toHaveValue("30");
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: "30",
      budgetMax: undefined,
    });
    // …and a single-value comparison takes the lower bound with it.
    openOperator("Budget Operator");
    fireEvent.click(screen.getByTitle("At most"));
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      budgetMin: undefined,
      budgetMax: "30",
    });
    expect(screen.getByLabelText("Budget Value")).toHaveValue("30");
  });

  it("dateRange keeps the native date input for the single value", () => {
    const onPatch = vi.fn<(updates: ExtraFilters) => void>();
    render(<RangeHarness defs={SHIPPED} onPatch={onPatch} />);
    openOperator("Shipped Operator");
    fireEvent.click(screen.getByTitle("On or after"));
    const input = screen.getByLabelText<HTMLInputElement>("Shipped Value");
    expect(input.type).toBe("date");
    fireEvent.change(input, { target: { value: "2026-01-01" } });
    expect(onPatch.mock.lastCall?.[0]).toStrictEqual({
      shippedFrom: "2026-01-01",
      shippedTo: undefined,
    });
  });
});
