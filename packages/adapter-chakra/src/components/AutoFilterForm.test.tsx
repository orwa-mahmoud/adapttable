import { act, fireEvent, screen, within } from "@testing-library/react";
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
import { renderChakra } from "../test-utils";
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
  renderChakra(
    <AutoFilterForm
      defs={defs}
      source={{ extra, setExtra, setExtras, allFilteredRows }}
      labels={labels}
    />
  );
  return { setExtra, setExtras };
}

describe("<AutoFilterForm> (Chakra)", () => {
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
    const input = screen.getByPlaceholderText("Type a name");
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
    fireEvent.change(screen.getByLabelText("Core team"), {
      target: { value: "true" },
    });
    expect(setExtra).toHaveBeenCalledWith("core", "true");
    fireEvent.change(screen.getByLabelText("Core team"), {
      target: { value: "" },
    });
    expect(setExtra).toHaveBeenCalledWith("core", undefined);
  });

  it("select: renders an empty All option, reads the value, writes the key, '' clears", () => {
    const { setExtra } = renderForm(
      [{ key: "status", type: "select", options: STATUS_OPTIONS }],
      { status: "active" }
    );
    const select = screen.getByLabelText("Status");
    expect(select).toHaveValue("active");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["All", "Active", "Inactive"]);
    fireEvent.change(select, { target: { value: "inactive" } });
    expect(setExtra).toHaveBeenCalledWith("status", "inactive");
    fireEvent.change(select, { target: { value: "" } });
    expect(setExtra).toHaveBeenCalledWith("status", "");
  });

  it("select and multiSelect without options render only their static chrome", () => {
    renderForm([
      { key: "plan", type: "select" },
      { key: "tags", type: "multiSelect" },
    ]);
    const select = screen.getByLabelText("Plan");
    expect(within(select).getAllByRole("option")).toHaveLength(1);
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
    const select = screen.getByLabelText("Hired At");
    expect(select).toHaveValue("gte");
    // The date flavour lists the date operator labels, with the operator
    // placeholder doubling as the clear option.
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual([
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

  it("dateRange: Relative writes the token, never a calendar day", () => {
    const { setExtras } = renderForm([{ key: "hiredAt", type: "dateRange" }]);
    fireEvent.change(screen.getByLabelText("Hired At"), {
      target: { value: "relative" },
    });
    expect(setExtras).toHaveBeenCalledWith({
      hiredAtFrom: "today",
      hiredAtTo: undefined,
      hiredAtOp: "relative",
    });
    fireEvent.change(screen.getByLabelText("Relative"), {
      target: { value: "last" },
    });
    expect(setExtras).toHaveBeenLastCalledWith({
      hiredAtFrom: "last:7",
      hiredAtTo: undefined,
      hiredAtOp: "relative",
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
    const select = screen.getByLabelText("Budget");
    expect(select).toHaveValue("");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual([
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
    // No operator picked yet → no value input.
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText("Value")).toBeNull();
  });

  it("numberRange: choosing At least then typing writes only the Min key", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }]);
    fireEvent.change(screen.getByLabelText("Budget"), {
      target: { value: "gte" },
    });
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
    fireEvent.change(screen.getByLabelText("Budget"), {
      target: { value: "eq" },
    });
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
    expect(screen.getByLabelText("Budget")).toHaveValue("lte");
    const input = screen.getByLabelText("Value");
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
    expect(screen.getByLabelText("Budget")).toHaveValue("between");
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
    expect(screen.getByLabelText("Budget")).toHaveValue("eq");
    expect(screen.getByLabelText("Value")).toHaveValue(5);
    expect(screen.queryByLabelText("From")).toBeNull();
    expect(screen.queryByLabelText("To")).toBeNull();
  });

  it("numberRange: resetting the select to the placeholder clears the pair", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMin: 3,
    });
    const select = screen.getByLabelText("Budget");
    expect(select).toHaveValue("gte");
    fireEvent.change(select, { target: { value: "" } });
    expect(setExtras).toHaveBeenCalledWith({
      budgetMin: undefined,
      budgetMax: undefined,
      budgetOp: undefined,
    });
    // Back to the untouched widget: operator placeholder, no value input.
    expect(select).toHaveValue("");
    expect(screen.queryByLabelText("Value")).toBeNull();
  });

  it("numberRange: switching Equal to Between carries the value into both bounds", () => {
    const { setExtras } = renderForm([{ key: "budget", type: "numberRange" }], {
      budgetMin: 5,
      budgetMax: 5,
    });
    fireEvent.change(screen.getByLabelText("Budget"), {
      target: { value: "between" },
    });
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
    const select = screen.getByLabelText("Status");
    // While loading the select renders a single disabled "…" option — the
    // static option list must never be mapped from the unresolved source.
    const placeholder = within(select).getByRole("option");
    expect(placeholder).toBeDisabled();
    expect(placeholder).toHaveTextContent("…");
    await act(async () => {
      resolve(STATUS_OPTIONS);
      await Promise.resolve();
    });
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["All", "Active", "Inactive"]);
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
    const { container } = renderChakra(
      <AutoFilterForm
        defs={defs}
        source={{ extra: {}, setExtra: vi.fn(), setExtras: vi.fn() }}
      />
    );
    expect(container.querySelector(".chakra-spinner")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    await act(async () => {
      resolve(TAG_OPTIONS);
      await Promise.resolve();
    });
    expect(container.querySelector(".chakra-spinner")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Beta" })).toBeInTheDocument();
  });

  it("renders a custom type through the registry widget kind", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = resolveFilterRegistry([{ ...text, type: "personText" }]);
    renderChakra(
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
});
