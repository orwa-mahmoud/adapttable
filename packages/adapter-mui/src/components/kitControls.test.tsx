import type { QueryFilterGroup } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  type FilterValue,
} from "../index";
import { renderMui } from "../test-utils";
import { FilterTreeBuilder } from "./FilterTreeBuilder";
import {
  FilterHeaderControl,
  FilterHeaderRow,
  FilterHeaderTrigger,
} from "./kitControls";

interface Row {
  name: string;
  team: string;
  tags: string[];
  core: boolean;
  age: number;
  hired: string;
}

const NAME_DEF: FilterDef<Row> = { key: "name", type: "text", label: "Name" };

const DEFS: FilterDef<Row>[] = [
  NAME_DEF,
  {
    key: "team",
    type: "select",
    label: "Team",
    options: [
      { value: "Core", label: "Core" },
      { value: "Web", label: "Web" },
    ],
  },
  {
    key: "tags",
    type: "multiSelect",
    label: "Tags",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
  { key: "core", type: "boolean", label: "Core" },
  { key: "age", type: "numberRange", label: "Age" },
  { key: "hired", type: "dateRange", label: "Hired" },
];

function HeaderHarness({ extra: initial = {} }: { extra?: ExtraFilters }) {
  const [extra, setExtra] = useState<ExtraFilters>(initial);
  const source = {
    extra,
    setExtra: (key: string, value: FilterValue) =>
      setExtra((prev) => ({ ...prev, [key]: value })),
    setExtras: (patch: ExtraFilters) =>
      setExtra((prev) => ({ ...prev, ...patch })),
  };
  return (
    <table>
      <thead>
        <FilterHeaderRow
          columns={[
            { key: "name" },
            { key: "team" },
            { key: "tags" },
            { key: "core" },
            { key: "age" },
            { key: "hired" },
          ]}
          defs={DEFS}
          source={source}
          labels={defaultLabels}
        />
      </thead>
    </table>
  );
}

function TriggerHarness({ extra: initial = {} }: { extra?: ExtraFilters }) {
  const [extra, setExtra] = useState<ExtraFilters>(initial);
  return (
    <FilterHeaderTrigger
      def={NAME_DEF}
      source={{
        extra,
        setExtra: (key: string, value: FilterValue) =>
          setExtra((prev) => ({ ...prev, [key]: value })),
        setExtras: (patch: ExtraFilters) =>
          setExtra((prev) => ({ ...prev, ...patch })),
      }}
      labels={defaultLabels}
    />
  );
}

function TreeHarness() {
  const [filterTree, setFilterTree] = useState<QueryFilterGroup | undefined>();
  return (
    <FilterTreeBuilder defs={DEFS} source={{ filterTree, setFilterTree }} />
  );
}

const pickSelect = (name: string, optionLabel: string) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name }));
  fireEvent.click(
    screen.getByRole("option", { name: optionLabel, hidden: true })
  );
};

describe("kit header filters (mui)", () => {
  it("announces the multi-select header as a popup trigger", () => {
    renderMui(<HeaderHarness />);
    const trigger = screen.getByLabelText("Tags");
    // Closed: it says a popup exists and that it is shut, and names nothing.
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Open: the trigger points at the menu it opened.
    const controls = trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });

  it("writes every compact header widget", () => {
    renderMui(<HeaderHarness />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    pickSelect("Team", "Web");
    expect(screen.getByRole("combobox", { name: "Team" })).toHaveTextContent(
      "Web"
    );
    fireEvent.click(screen.getByLabelText("Tags"));
    fireEvent.click(screen.getByRole("checkbox", { name: "A" }));
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
    expect(screen.getByLabelText("Tags")).toHaveTextContent("2");
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    pickSelect("Core", "True");
    expect(screen.getByRole("combobox", { name: "Core" })).toHaveTextContent(
      "True"
    );
    fireEvent.change(screen.getByLabelText("Age"), {
      target: { value: "30" },
    });
    expect(screen.getByLabelText("Age")).toHaveValue(30);
    fireEvent.change(screen.getByLabelText("Hired"), {
      target: { value: "2024-01-01" },
    });
    expect(screen.getByLabelText("Hired")).toHaveValue("2024-01-01");
  });

  it("writes the upper bound of a between pair", () => {
    renderMui(
      <HeaderHarness extra={{ ageOp: "between", ageMin: "10", ageMax: "40" }} />
    );
    const bounds = screen.getAllByLabelText("Age");
    expect(bounds).toHaveLength(2);
    fireEvent.change(bounds[1]!, { target: { value: "50" } });
    expect(bounds[1]).toHaveValue(50);
  });

  it("renders a lone header control", () => {
    function One() {
      const [extra, setExtra] = useState<ExtraFilters>({});
      return (
        <FilterHeaderControl
          def={DEFS[1]!}
          source={{
            extra,
            setExtra: (key, value) =>
              setExtra((prev) => ({ ...prev, [key]: value })),
            setExtras: (patch) => setExtra((prev) => ({ ...prev, ...patch })),
          }}
          labels={defaultLabels}
        />
      );
    }
    renderMui(<One />);
    pickSelect("Team", "Core");
    expect(screen.getByRole("combobox", { name: "Team" })).toHaveTextContent(
      "Core"
    );
  });
});

describe("kit filter tree (mui)", () => {
  it("adds a condition and writes the value", () => {
    renderMui(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "Ada" },
    });
    expect(screen.getByRole("combobox", { name: "Field" })).toHaveTextContent(
      "Name"
    );
    expect(screen.getByLabelText("Value")).toHaveValue("Ada");
  });

  it("switches field, operator, and a relative date", () => {
    renderMui(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    pickSelect("Field", "Age");
    pickSelect("Operator", "Between");
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "9" } });
    pickSelect("Field", "Hired");
    pickSelect("Operator", "Relative");
    pickSelect("Relative", "Last N days");
    fireEvent.change(screen.getByLabelText("N"), { target: { value: "14" } });
    expect(screen.getByLabelText("N")).toHaveValue(14);
  });
});

/**
 * The funnel on a column header claims "this column is filtered". A funnel that
 * lights up for a value the user cleared is worse than no funnel at all, so the
 * emptiness rules are asserted one shape at a time rather than trusted.
 */
describe("kit header filter trigger (mui)", () => {
  const trigger = () =>
    document.querySelector('[data-adapttable-part="filter-header-trigger"]')!;

  it("stays quiet with no filter at all", () => {
    renderMui(<TriggerHarness />);

    expect(trigger()).not.toHaveAttribute("data-active");
  });

  it.each([
    ["an empty string", ""],
    ["a null", null],
    ["an empty array", [] as string[]],
  ])("treats %s as no filter", (_name, value) => {
    renderMui(<TriggerHarness extra={{ name: value as FilterValue }} />);

    expect(trigger()).not.toHaveAttribute("data-active");
  });

  it.each([
    ["a typed value", "Ada"],
    ["a non-empty array", ["a"] as string[]],
  ])("marks itself active for %s", (_name, value) => {
    renderMui(<TriggerHarness extra={{ name: value as FilterValue }} />);

    expect(trigger()).toHaveAttribute("data-active");
  });

  it("opens the column's own filter field", () => {
    renderMui(<TriggerHarness />);
    fireEvent.click(trigger());

    expect(
      document.querySelector('[data-adapttable-part="filter-header-cell"]')
    ).not.toBeNull();
  });
});

describe("kit multi-select header widget (mui)", () => {
  const openTags = () => {
    renderMui(<HeaderHarness extra={{ tags: ["a"] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Tags" }));
  };

  it("shows which options are already chosen", () => {
    openTags();

    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "B" })).not.toBeChecked();
  });

  it("adds an option that was not selected", () => {
    openTags();
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));

    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
  });

  it("removes an option that was selected", () => {
    openTags();
    fireEvent.click(screen.getByRole("checkbox", { name: "A" }));

    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
  });
});
