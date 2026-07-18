import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  ExtraFilters,
  FilterDef,
  FilterOption,
  FilterValue,
  TableLabels,
} from "../index";
import { renderBaseUi } from "../test-utils";
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
  labels?: TableLabels
) {
  const setExtra = vi.fn<(key: string, value: FilterValue) => void>();
  const setExtras = vi.fn<(updates: ExtraFilters) => void>();
  const view = renderBaseUi(
    <AutoFilterForm
      defs={defs}
      source={{ extra, setExtra, setExtras }}
      labels={labels}
    />
  );
  return { setExtra, setExtras, view };
}

/**
 * Base UI's `Select` is a button-combobox: open it, then click an option. The
 * trigger (role `combobox`) shows the current selection's label text, which is
 * what we assert "value" against.
 */
/** Base UI Select commits on click only after pointerdown (mouse selection gate). */
function openSelect(name: string): HTMLElement {
  const trigger = screen.getByRole("combobox", { name });
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  return trigger;
}
function pickOption(selectName: string, optionLabel: string) {
  openSelect(selectName);
  const option = screen.getByRole("option", { name: optionLabel });
  fireEvent.pointerDown(option);
  fireEvent.click(option);
}
/** The visible label inside a closed Base UI Select trigger. */
function triggerText(name: string): string {
  return screen.getByRole("combobox", { name }).textContent ?? "";
}

describe("<AutoFilterForm> (Base UI)", () => {
  it("text: labels from the humanized key, shows the placeholder, writes the key", () => {
    const { setExtra } = renderForm([
      { key: "firstName", type: "text", placeholder: "Type a name" },
    ]);
    const input = screen.getByLabelText("First Name");
    expect(input).toHaveAttribute("placeholder", "Type a name");
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "ali" } });
    expect(setExtra).toHaveBeenCalledWith("firstName", "ali");
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
    const inactiveOpt = screen.getByRole("option", { name: "Inactive" });
    fireEvent.pointerDown(inactiveOpt);
    fireEvent.click(inactiveOpt);
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
      "On",
      "On or after",
      "On or before",
      "Between",
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
      "Mindestens",
      "Höchstens",
      "Zwischen",
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
    });
  });

  it("numberRange: an upper-bound state mounts as At most reading the Max key", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMax: 9,
    });
    expect(triggerText("Operator")).toBe("At most");
    const input = screen.getByLabelText("Value");
    // Base UI's number TextField reflects the value as a number, not a string.
    expect(input).toHaveValue(9);
    fireEvent.change(input, { target: { value: "7" } });
    expect(setExtras).toHaveBeenCalledWith({
      budgetMin: undefined,
      budgetMax: "7",
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
    });
    fireEvent.change(from, { target: { value: "3" } });
    expect(setExtras).toHaveBeenLastCalledWith({
      budgetMin: "3",
      budgetMax: "8",
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
    expect(setExtras).toHaveBeenCalledWith({ budgetMin: "5", budgetMax: "5" });
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
    const { container } = renderBaseUi(
      <AutoFilterForm
        defs={defs}
        source={{ extra: {}, setExtra: vi.fn(), setExtras: vi.fn() }}
      />
    );
    expect(container.querySelector(".adapttable-spinner")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    await act(async () => {
      resolve(TAG_OPTIONS);
      await Promise.resolve();
    });
    expect(container.querySelector(".adapttable-spinner")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Beta" })).toBeInTheDocument();
  });
});
