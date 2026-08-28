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
import { renderAntd } from "../test-utils";
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

function openSelect(name: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name }));
}

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
      <caption data-testid="extra">{JSON.stringify(extra)}</caption>
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

describe("kit header filters (antd)", () => {
  it("writes every compact header widget", () => {
    renderAntd(<HeaderHarness />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    openSelect("Team");
    fireEvent.click(screen.getByTitle("Core"));
    expect(screen.getByTestId("extra")).toHaveTextContent("Core");
    fireEvent.click(screen.getByLabelText("Tags"));
    fireEvent.click(screen.getByRole("checkbox", { name: "A" }));
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
    expect(screen.getByLabelText("Tags")).toHaveTextContent("2");
    openSelect("Core");
    fireEvent.click(screen.getByTitle(defaultLabels.boolTrue));
    expect(screen.getByTestId("extra")).toHaveTextContent("true");
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
    renderAntd(
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
        <>
          <pre data-testid="extra">{JSON.stringify(extra)}</pre>
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
        </>
      );
    }
    renderAntd(<One />);
    openSelect("Team");
    fireEvent.click(screen.getByTitle("Core"));
    expect(screen.getByTestId("extra")).toHaveTextContent("Core");
  });
});

describe("kit filter tree (antd)", () => {
  it("adds a condition and writes the value", () => {
    renderAntd(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Value")).toHaveValue("Ada");
    const field = screen.getByRole("combobox", { name: "Field" });
    expect(field).toBeInTheDocument();
    expect(screen.getByTitle("Name")).toHaveTextContent("Name");
  });
});

/**
 * The funnel on a column header claims "this column is filtered". A funnel that
 * lights up for a value the user cleared is worse than no funnel at all, so the
 * emptiness rules are asserted one shape at a time rather than trusted.
 */
describe("kit header filter trigger (antd)", () => {
  const trigger = () =>
    document.querySelector('[data-adapttable-part="filter-header-trigger"]')!;

  it("stays quiet with no filter at all", () => {
    renderAntd(<TriggerHarness />);

    expect(trigger()).not.toHaveAttribute("data-active");
  });

  it.each([
    ["an empty string", ""],
    ["a null", null],
    ["an empty array", [] as string[]],
  ])("treats %s as no filter", (_name, value) => {
    renderAntd(<TriggerHarness extra={{ name: value as FilterValue }} />);

    expect(trigger()).not.toHaveAttribute("data-active");
  });

  it.each([
    ["a typed value", "Ada"],
    ["a non-empty array", ["a"] as string[]],
  ])("marks itself active for %s", (_name, value) => {
    renderAntd(<TriggerHarness extra={{ name: value as FilterValue }} />);

    expect(trigger()).toHaveAttribute("data-active");
  });

  it("opens the column's own filter field", () => {
    renderAntd(<TriggerHarness />);
    fireEvent.click(trigger());

    expect(
      document.querySelector('[data-adapttable-part="filter-header-cell"]')
    ).not.toBeNull();
  });
});

describe("kit multi-select header widget (antd)", () => {
  const openTags = () => {
    renderAntd(<HeaderHarness extra={{ tags: ["a"] }} />);
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
