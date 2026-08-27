import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  defaultFilterRegistry,
  type ExtraFilters,
  type FilterDef,
  type FilterOption,
  type FilterValue,
  resolveFilterRegistry,
  type TableLabels,
} from "../index";
import { renderRadix } from "../test-utils";
import { AutoFilterForm } from "./AutoFilterForm";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];
const TAG_OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

function renderForm(
  defs: readonly FilterDef[],
  extra: ExtraFilters = {},
  labels?: TableLabels,
  allFilteredRows?: readonly { id: string }[]
) {
  const setExtra = vi.fn<(key: string, value: FilterValue) => void>();
  const setExtras = vi.fn<(updates: ExtraFilters) => void>();
  const view = renderRadix(
    <AutoFilterForm
      defs={defs}
      source={{ extra, setExtra, setExtras, allFilteredRows }}
      labels={labels}
    />
  );
  return { setExtra, setExtras, view };
}

/**
 * Radix's `Select` is a button-combobox: open it, then click an option. The
 * trigger (role `combobox`) shows the current selection's label text, which is
 * what we assert "value" against.
 */
function openSelect(name: string): HTMLElement {
  const trigger = screen.getByRole("combobox", { name });
  fireEvent.click(trigger);
  return trigger;
}
function pickOption(selectName: string, optionLabel: string) {
  openSelect(selectName);
  fireEvent.click(screen.getByRole("option", { name: optionLabel }));
}
/** The visible label inside a closed Radix Select trigger. */
function triggerText(name: string): string {
  return screen.getByRole("combobox", { name }).textContent ?? "";
}

describe("<AutoFilterForm> (Radix)", () => {
  it("checklist hides without allFilteredRows and checks a counted value", () => {
    renderForm([{ key: "team", type: "checklist", getValue: () => "Core" }]);
    expect(screen.queryByLabelText("Search values")).toBeNull();
    const { setExtra } = renderForm(
      [{ key: "team", type: "checklist", getValue: () => "Core" }],
      {},
      undefined,
      [{ id: "1" }]
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(setExtra).toHaveBeenCalledWith("team", ["Core"]);
  });

  it("text: labels from the humanized key, shows the placeholder, writes the key", () => {
    const { setExtras } = renderForm([
      { key: "firstName", type: "text", placeholder: "Type a name" },
    ]);
    const input = screen.getByLabelText("First Name");
    expect(input).toHaveAttribute("placeholder", "Type a name");
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "ali" } });
    expect(setExtras).toHaveBeenCalledWith({
      firstName: "ali",
      firstNameOp: "contains",
    });
  });

  it("boolean: tri-state select writes true and clears", () => {
    const { setExtra } = renderForm([
      { key: "core", type: "boolean", label: "Core team" },
    ]);
    pickOption("Core team", "True");
    expect(setExtra).toHaveBeenCalledWith("core", "true");
  });

  it("select: renders an empty All option, reads the value, writes the key, '' clears", () => {
    const { setExtra } = renderForm(
      [{ key: "status", type: "select", options: STATUS_OPTIONS }],
      { status: "active" }
    );
    // The trigger reflects the current value's label.
    expect(triggerText("Status")).toBe("Active");
    openSelect("Status");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All",
      "Active",
      "Inactive",
    ]);
    fireEvent.click(screen.getByRole("option", { name: "Inactive" }));
    expect(setExtra).toHaveBeenCalledWith("status", "inactive");
    // Re-open and pick the clearing "All" option → writes "".
    pickOption("Status", "All");
    expect(setExtra).toHaveBeenCalledWith("status", "");
  });

  it("select and multiSelect without options render only their static chrome", () => {
    renderForm([
      { key: "plan", type: "select" },
      { key: "tags", type: "multiSelect" },
    ]);
    openSelect("Plan");
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("multiSelect: tolerates a scalar value and appends the next selection", () => {
    const { setExtra } = renderForm(
      [{ key: "tags", type: "multiSelect", options: TAG_OPTIONS }],
      { tags: "a" }
    );
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Beta" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Beta" }));
    expect(setExtra).toHaveBeenCalledWith("tags", ["a", "b"]);
  });

  it("multiSelect: unchecking the last option writes [] (clears)", () => {
    const { setExtra } = renderForm(
      [{ key: "tags", type: "multiSelect", options: TAG_OPTIONS }],
      { tags: ["a"] }
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Alpha" }));
    expect(setExtra).toHaveBeenCalledWith("tags", []);
  });

  it("multiSelect: an empty-string value means nothing is selected", () => {
    renderForm([{ key: "tags", type: "multiSelect", options: TAG_OPTIONS }], {
      tags: "",
    });
    expect(screen.getByRole("checkbox", { name: "Alpha" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Beta" })).not.toBeChecked();
  });

  it("dateRange: a lower-bound state mounts as On or after; typing writes only the From key", () => {
    const { setExtras } = renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtFrom: "2026-01-01",
    });
    // The range operator select self-names "Operator" — the field name ("Hired
    // At") is the visual FormField label above, not the control's a11y name.
    expect(triggerText("Operator")).toBe("On or after");
    openSelect("Operator");
    // The date flavour lists the date operator labels, with the operator
    // placeholder doubling as the clear option.
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Operator",
      "Before",
      "After",
      "On",
      "On or after",
      "On or before",
      "Between",
      "Relative",
      "Is empty",
    ]);
    // Close the popup before reaching for the value input.
    fireEvent.keyDown(document.body, { key: "Escape" });
    const input = screen.getByLabelText("Value");
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveValue("2026-01-01");
    fireEvent.change(input, { target: { value: "2026-02-01" } });
    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: "2026-02-01",
      hiredAtTo: undefined,
      hiredAtOp: "gte",
    });
  });

  it("numberRange: lists the localized number operators behind the operator placeholder", () => {
    renderForm(
      [{ key: "budget", type: "numberRange" }],
      {},
      {
        operator: "Vergleich",
        opEqual: "Gleich",
        opAtLeast: "Mindestens",
        opAtMost: "Höchstens",
        opBetween: "Zwischen",
      }
    );
    expect(triggerText("Vergleich")).toBe("Vergleich");
    openSelect("Vergleich");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Vergleich",
      "Gleich",
      "Not equal",
      "Greater than",
      "Mindestens",
      "Less than",
      "Höchstens",
      "Zwischen",
      "Is any of",
      "Is none of",
    ]);
    fireEvent.keyDown(document.body, { key: "Escape" });
    // No operator picked yet → no value input.
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText("Value")).toBeNull();
  });

  it("numberRange: choosing At least then typing writes only the Min key", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }]);
    pickOption("Operator", "At least");
    const input = screen.getByLabelText("Value");
    expect(input).toHaveAttribute("type", "number");
    fireEvent.change(input, { target: { value: "5" } });
    expect(setExtras).toHaveBeenLastCalledWith({
      budgetMin: "5",
      budgetMax: undefined,
      budgetOp: "gte",
    });
  });

  it("numberRange: Equal writes BOTH keys with the one value", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }]);
    pickOption("Operator", "Equal");
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "10" },
    });
    expect(setExtras).toHaveBeenLastCalledWith({
      budgetMin: "10",
      budgetMax: "10",
      budgetOp: "eq",
    });
  });

  it("numberRange: an upper-bound state mounts as At most reading the Max key", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMax: 9,
    });
    expect(triggerText("Operator")).toBe("At most");
    const input = screen.getByLabelText("Value");
    // Radix's number TextField reflects the value as a number, not a string.
    expect(input).toHaveValue(9);
    fireEvent.change(input, { target: { value: "7" } });
    expect(setExtras).toHaveBeenCalledWith({
      budgetMin: undefined,
      budgetMax: "7",
      budgetOp: "lte",
    });
  });

  it("numberRange: Between renders the From/To pair and writes both keys", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMin: 2,
      budgetMax: 8,
    });
    expect(triggerText("Operator")).toBe("Between");
    const from = screen.getByLabelText("From");
    const to = screen.getByLabelText("To");
    expect(from).toHaveValue(2);
    expect(to).toHaveValue(8);
    fireEvent.change(to, { target: { value: "9" } });
    expect(setExtras).toHaveBeenLastCalledWith({
      budgetMin: "2",
      budgetMax: "9",
      budgetOp: "between",
    });
    fireEvent.change(from, { target: { value: "3" } });
    expect(setExtras).toHaveBeenLastCalledWith({
      budgetMin: "3",
      budgetMax: "8",
      budgetOp: "between",
    });
  });

  it("numberRange: equal bounds mount as Equal with the single shared value", () => {
    renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMin: 5,
      budgetMax: 5,
    });
    expect(triggerText("Operator")).toBe("Equal");
    expect(screen.getByLabelText("Value")).toHaveValue(5);
    expect(screen.queryByLabelText("From")).toBeNull();
    expect(screen.queryByLabelText("To")).toBeNull();
  });

  it("numberRange: resetting the select to the placeholder clears the pair", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMin: 3,
    });
    expect(triggerText("Operator")).toBe("At least");
    // The operator placeholder doubles as the clear option.
    pickOption("Operator", "Operator");
    expect(setExtras).toHaveBeenCalledWith({
      budgetMin: undefined,
      budgetMax: undefined,
      budgetOp: undefined,
    });
    // Back to the untouched widget: operator placeholder, no value input.
    expect(triggerText("Operator")).toBe("Operator");
    expect(screen.queryByLabelText("Value")).toBeNull();
  });

  it("numberRange: switching Equal to Between carries the value into both bounds", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMin: 5,
      budgetMax: 5,
    });
    pickOption("Operator", "Between");
    expect(setExtras).toHaveBeenCalledWith({
      budgetMin: "5",
      budgetMax: "5",
      budgetOp: "between",
    });
  });

  it("select: shows one disabled placeholder option while async options load", async () => {
    let resolve!: (value: readonly FilterOption[]) => void;
    renderForm([
      {
        key: "status",
        type: "select",
        options: () =>
          new Promise<readonly FilterOption[]>((r) => {
            resolve = r;
          }),
      },
    ]);
    // While loading the select renders a single disabled "…" option — the
    // static option list must never be mapped from the unresolved source.
    openSelect("Status");
    const placeholder = screen.getByRole("option");
    expect(placeholder).toHaveAttribute("data-disabled");
    expect(placeholder).toHaveTextContent("…");
    fireEvent.keyDown(document.body, { key: "Escape" });
    await act(async () => {
      resolve(STATUS_OPTIONS);
      await Promise.resolve();
    });
    openSelect("Status");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All",
      "Active",
      "Inactive",
    ]);
  });

  it("multiSelect: shows a spinner while async options load, then the checkboxes", async () => {
    let resolve!: (value: readonly FilterOption[]) => void;
    const defs: FilterDef[] = [
      {
        key: "tags",
        type: "multiSelect",
        options: () =>
          new Promise<readonly FilterOption[]>((r) => {
            resolve = r;
          }),
      },
    ];
    const { container } = renderRadix(
      <AutoFilterForm
        defs={defs}
        source={{ extra: {}, setExtra: vi.fn(), setExtras: vi.fn() }}
      />
    );
    expect(container.querySelector(".rt-Spinner")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    await act(async () => {
      resolve(TAG_OPTIONS);
      await Promise.resolve();
    });
    expect(container.querySelector(".rt-Spinner")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Beta" })).toBeInTheDocument();
  });

  it("renders a custom type through the registry widget kind", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = resolveFilterRegistry([{ ...text, type: "personText" }]);
    renderRadix(
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
        registry={registry}
      />
    );
    expect(screen.getByPlaceholderText("Find…")).toBeVisible();
  });

  /**
   * The Relative operator swaps the date input for a preset select, and only
   * the two counted presets ("Last N days" / "Next N days") get an N beside
   * them. Whether that N appears, and what token it writes, is the whole
   * feature — none of it is visible from the other operators' tests.
   */
  it("dateRange relative: a named preset shows no count beside it", () => {
    renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtOp: "relative",
      hiredAtFrom: "today",
    });

    expect(triggerText("Relative")).toBe("Today");
    expect(screen.queryByLabelText("Value")).toBeNull();
  });

  it("dateRange relative: a counted preset reads its N out of the token", () => {
    renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtOp: "relative",
      hiredAtFrom: "last:30",
    });

    expect(triggerText("Relative")).toBe("Last N days");
    expect(screen.getByLabelText("Value")).toHaveValue(30);
  });

  it("dateRange relative: typing a new N rewrites the counted token", () => {
    const { setExtras } = renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtOp: "relative",
      hiredAtFrom: "last:30",
    });
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "14" },
    });

    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: "last:14",
      hiredAtTo: undefined,
      hiredAtOp: "relative",
    });
  });

  it("dateRange relative: switching to a counted preset seeds the default N", () => {
    const { setExtras } = renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtOp: "relative",
      hiredAtFrom: "today",
    });
    pickOption("Relative", "Last N days");

    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: "last:7",
      hiredAtTo: undefined,
      hiredAtOp: "relative",
    });
  });

  it("dateRange relative: switching to a named preset drops the count", () => {
    const { setExtras } = renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtOp: "relative",
      hiredAtFrom: "last:30",
    });
    pickOption("Relative", "This month");

    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: "thisMonth",
      hiredAtTo: undefined,
      hiredAtOp: "relative",
    });
  });

  it("dateRange relative: offers every preset in display order", () => {
    renderForm([{ key: "hiredAt", type: "dateRange" }], {
      hiredAtOp: "relative",
      hiredAtFrom: "today",
    });
    openSelect("Relative");

    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Today",
      "Yesterday",
      "Tomorrow",
      "This week",
      "This month",
      "Previous month",
      "Last N days",
      "Next N days",
    ]);
  });
});
