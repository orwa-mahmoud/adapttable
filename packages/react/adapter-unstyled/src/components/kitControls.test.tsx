import type { QueryFilterGroup } from "@adapttable/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  type FilterValue,
} from "../index";
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

const DEFS: FilterDef<Row>[] = [
  { key: "name", type: "text", label: "Name" },
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

function TreeHarness() {
  const [filterTree, setFilterTree] = useState<QueryFilterGroup | undefined>();
  return (
    <FilterTreeBuilder defs={DEFS} source={{ filterTree, setFilterTree }} />
  );
}

describe("kit header filters (unstyled)", () => {
  it("writes every compact header widget", () => {
    render(<HeaderHarness />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "Web" },
    });
    expect(screen.getByLabelText("Team")).toHaveValue("Web");
    const tagsTrigger = screen
      .getAllByLabelText("Tags")
      .find((element) => element.tagName === "SUMMARY");
    if (!tagsTrigger) throw new Error("Tags filter trigger was not rendered");
    fireEvent.click(tagsTrigger);
    fireEvent.click(screen.getByRole("checkbox", { name: "A" }));
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
    expect(tagsTrigger).toHaveTextContent("2");
    fireEvent.change(screen.getByLabelText("Core"), {
      target: { value: "true" },
    });
    expect(screen.getByLabelText("Core")).toHaveValue("true");
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
    render(
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
    render(<One />);
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "Core" },
    });
    expect(screen.getByLabelText("Team")).toHaveValue("Core");
  });
});

function TriggerHarness({
  def,
  closeOnSelect,
}: Readonly<{
  def: FilterDef<Row>;
  closeOnSelect?: boolean;
}>) {
  const [extra, setExtra] = useState<ExtraFilters>({});
  const source = {
    extra,
    setExtra: (key: string, value: FilterValue) =>
      setExtra((prev) => ({ ...prev, [key]: value })),
    setExtras: (patch: ExtraFilters) =>
      setExtra((prev) => ({ ...prev, ...patch })),
  };
  return (
    <FilterHeaderTrigger
      def={def}
      source={source}
      labels={defaultLabels}
      closeOnSelect={closeOnSelect}
    />
  );
}

describe("kit header filter trigger (unstyled)", () => {
  it("stays open after picking a text operator so the value can still be typed", () => {
    render(<TriggerHarness def={DEFS[0]!} />);
    const trigger = document.querySelector(
      '[data-adapttable-part="filter-header-trigger"]'
    );
    expect(trigger).not.toBeNull();
    fireEvent.click(trigger!.querySelector("summary") ?? trigger!);
    fireEvent.change(screen.getByLabelText("Operator"), {
      target: { value: "eq" },
    });
    expect(trigger).toHaveAttribute("open");
    expect(
      document.querySelector('[data-adapttable-part="filter-input"]')
    ).not.toBeNull();
  });

  it("closes after a finished select write only when closeOnSelect is on", async () => {
    const { unmount } = render(<TriggerHarness def={DEFS[1]!} />);
    const openAndPick = () => {
      const trigger = document.querySelector(
        '[data-adapttable-part="filter-header-trigger"]'
      );
      expect(trigger).not.toBeNull();
      fireEvent.click(trigger!.querySelector("summary") ?? trigger!);
      fireEvent.change(
        document.querySelector('[data-adapttable-part="filter-select"]')!,
        { target: { value: "Web" } }
      );
      return trigger;
    };
    expect(openAndPick()).toHaveAttribute("open");
    unmount();

    render(<TriggerHarness def={DEFS[1]!} closeOnSelect />);
    openAndPick();
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      document.querySelector('[data-adapttable-part="filter-header-trigger"]')
    ).not.toHaveAttribute("open");
  });
});

describe("kit filter tree (unstyled)", () => {
  it("adds a condition and writes the value", () => {
    render(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Field")).toHaveValue("name");
    expect(screen.getByLabelText("Value")).toHaveValue("Ada");
  });

  it("switches field, operator, and a relative date", () => {
    render(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Field"), {
      target: { value: "age" },
    });
    fireEvent.change(screen.getByLabelText("Operator"), {
      target: { value: "between" },
    });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Field"), {
      target: { value: "hired" },
    });
    fireEvent.change(screen.getByLabelText("Operator"), {
      target: { value: "relative" },
    });
    fireEvent.change(screen.getByLabelText("Relative"), {
      target: { value: "last" },
    });
    fireEvent.change(screen.getByLabelText("N"), { target: { value: "14" } });
    expect(screen.getByLabelText("N")).toHaveValue(14);
  });
});
