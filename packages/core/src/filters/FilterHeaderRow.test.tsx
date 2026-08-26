import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { filterHeaderTestSlots } from "../internal/chromeTestSlots";
import { defaultLabels } from "../labels";
import type { ExtraFilters } from "../types";
import { defaultFilterRegistry } from "./filterBuiltins";
import type { FilterDef } from "./filterDefs";
import {
  filterDefForColumn,
  FilterHeaderChrome,
  FilterHeaderControlChrome,
  headerFilterStickTop,
} from "./FilterHeaderRow";
import { withFilterType } from "./filterRegistry";

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

function Harness({
  extra: initial = {},
  pads = false,
}: {
  extra?: ExtraFilters;
  pads?: boolean;
}) {
  const [extra, setExtra] = useState<ExtraFilters>(initial);
  return (
    <table>
      <thead>
        <FilterHeaderChrome
          slots={filterHeaderTestSlots}
          columns={[
            { key: "name" },
            { key: "team" },
            { key: "tags" },
            { key: "core" },
            { key: "age" },
            { key: "hired" },
            { key: "other" },
          ]}
          defs={DEFS}
          source={{
            extra,
            setExtra: (key, value) =>
              setExtra((prev) => ({ ...prev, [key]: value })),
            setExtras: (patch) => setExtra((prev) => ({ ...prev, ...patch })),
          }}
          labels={defaultLabels}
          expandable={pads}
          showReorder={pads}
          selection={pads}
          showActions={pads}
          columnSpacers={pads ? { start: 12, end: 8 } : undefined}
          pinSide={(key) => (key === "name" ? "start" : undefined)}
          cellStyle={(column) =>
            column.key === "name" ? { top: 40 } : undefined
          }
          stickyAttr
          classNames={{
            filterHeaderRow: "row-cls",
            filterHeaderCell: "cell-cls",
            filterHeaderInput: "input-cls",
            headerCell: "head-cls",
          }}
        />
      </thead>
    </table>
  );
}

describe("headerFilterStickTop", () => {
  it("leaves the base style when the header is not sticky", () => {
    expect(headerFilterStickTop(false, { color: "red" }, 12)).toEqual({
      color: "red",
    });
  });

  it("overlays top and extras when the header is sticky", () => {
    expect(
      headerFilterStickTop(true, { color: "red" }, 12, { position: "sticky" })
    ).toEqual({
      position: "sticky",
      color: "red",
      top: 12,
    });
  });
});

describe("filterDefForColumn", () => {
  it("matches a def by column key", () => {
    expect(filterDefForColumn(DEFS, "team")?.type).toBe("select");
    expect(filterDefForColumn(DEFS, "missing")).toBeUndefined();
    expect(
      filterDefForColumn(
        [{ key: "name", type: "text", column: "person" }],
        "person"
      )?.key
    ).toBe("name");
  });
});

describe("FilterHeaderChrome", () => {
  it("writes a text filter and leaves unmatched columns empty", () => {
    render(<Harness />);
    expect(screen.getByRole("row", { name: "Column filters" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    const cells = document.querySelectorAll(
      '[data-adapttable-part="filter-header-cell"]'
    );
    expect(cells).toHaveLength(7);
    expect(cells[6]?.querySelector("input, select")).toBeNull();
  });

  it("writes a select value and clears it", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "Web" },
    });
    expect(screen.getByLabelText("Team")).toHaveValue("Web");
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "" },
    });
    expect(screen.getByLabelText("Team")).toHaveValue("");
  });

  it("writes a multi-select from the compact menu", () => {
    render(<Harness />);
    const tagsTrigger = screen
      .getAllByLabelText("Tags")
      .find((element) => element.tagName === "SUMMARY");
    if (!tagsTrigger) throw new Error("Tags filter trigger was not rendered");
    fireEvent.click(tagsTrigger);
    fireEvent.click(screen.getByRole("checkbox", { name: "A" }));
    expect(screen.getByRole("checkbox", { name: "A" })).toBeChecked();
    expect(tagsTrigger).toHaveTextContent("A");
    fireEvent.click(screen.getByRole("checkbox", { name: "B" }));
    expect(screen.getByRole("checkbox", { name: "B" })).toBeChecked();
    expect(tagsTrigger).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("checkbox", { name: "A" }));
    expect(screen.getByRole("checkbox", { name: "A" })).not.toBeChecked();
    expect(tagsTrigger).toHaveTextContent("B");
  });

  it("writes a boolean tri-state", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Core"), {
      target: { value: "true" },
    });
    expect(screen.getByLabelText("Core")).toHaveValue("true");
  });

  it("writes a one-bound number range, defaulting the operator to gte", () => {
    render(<Harness />);
    const age = screen.getByLabelText("Age");
    fireEvent.change(age, { target: { value: "30" } });
    expect(age).toHaveValue(30);
  });

  it("writes the upper bound of a between pair", () => {
    render(
      <Harness extra={{ ageOp: "between", ageMin: "10", ageMax: "40" }} />
    );
    const bounds = screen.getAllByLabelText("Age");
    expect(bounds).toHaveLength(2);
    fireEvent.change(bounds[1]!, { target: { value: "50" } });
    expect(bounds[1]).toHaveValue(50);
  });

  it("renders nothing when disabled or defs are empty", () => {
    const { rerender } = render(
      <table>
        <thead>
          <FilterHeaderChrome
            slots={filterHeaderTestSlots}
            enabled={false}
            columns={[{ key: "name" }]}
            defs={DEFS}
            source={{
              extra: {},
              setExtra: () => undefined,
              setExtras: () => undefined,
            }}
            labels={defaultLabels}
          />
        </thead>
      </table>
    );
    expect(screen.queryByRole("row", { name: "Column filters" })).toBeNull();
    rerender(
      <table>
        <thead>
          <FilterHeaderChrome
            slots={filterHeaderTestSlots}
            columns={[{ key: "name" }]}
            defs={[]}
            source={{
              extra: {},
              setExtra: () => undefined,
              setExtras: () => undefined,
            }}
            labels={defaultLabels}
          />
        </thead>
      </table>
    );
    expect(screen.queryByRole("row", { name: "Column filters" })).toBeNull();
  });

  it("renders pads, spacers, pin and sticky marks", () => {
    render(<Harness pads />);
    expect(
      document.querySelector('[data-adapttable-part="expand-header"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="reorder-header"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="selection-header"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="actions-header"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="column-spacer-start"]')
    ).not.toBeNull();
    const nameCell = document.querySelector<HTMLElement>(
      '[data-column-key="name"]'
    )!;
    expect(nameCell.dataset.pinned).toBe("start");
    expect(nameCell.dataset.sticky).toBe("true");
    expect(nameCell.style.top).toBe("40px");
  });

  it("draws a registered custom type via its widget kind", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = withFilterType(defaultFilterRegistry, {
      ...text,
      type: "personText",
    });
    render(
      <table>
        <thead>
          <FilterHeaderChrome
            slots={filterHeaderTestSlots}
            columns={[{ key: "name" }]}
            defs={[{ key: "name", type: "personText", label: "Name" }]}
            source={{
              extra: {},
              setExtra: () => undefined,
              setExtras: () => undefined,
            }}
            labels={defaultLabels}
            registry={registry}
          />
        </thead>
      </table>
    );
    expect(screen.getByLabelText("Name")).toBeVisible();
  });

  it("draws a registered custom render instead of the kit widget", () => {
    const text = defaultFilterRegistry.get("text")!;
    const registry = withFilterType(defaultFilterRegistry, {
      ...text,
      type: "personCard",
      render: () => <output>custom-person</output>,
    });
    render(
      <table>
        <thead>
          <FilterHeaderChrome
            slots={filterHeaderTestSlots}
            columns={[{ key: "name" }]}
            defs={[{ key: "name", type: "personCard", label: "Name" }]}
            source={{
              extra: {},
              setExtra: () => undefined,
              setExtras: () => undefined,
            }}
            labels={defaultLabels}
            registry={registry}
          />
        </thead>
      </table>
    );
    expect(screen.getByText("custom-person")).toBeVisible();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });
});

describe("FilterHeaderControlChrome", () => {
  it("renders the compact widget for a standalone def", () => {
    const extra: ExtraFilters = {};
    render(
      <FilterHeaderControlChrome
        slots={filterHeaderTestSlots}
        def={DEFS[0]!}
        source={{
          extra,
          setExtra: () => undefined,
          setExtras: () => undefined,
        }}
        labels={defaultLabels}
      />
    );
    expect(screen.getByLabelText("Name")).toBeVisible();
  });
});
