import { defaultLabels, type SelectionState } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderAntd } from "../test-utils";
import {
  ADAPTTABLE_GROUP,
  type AdaptTableGroupRow,
  buildGroupedDataSource,
  groupedRowKey,
  GroupHeaderCard,
  GroupHeaderCell,
  GroupSelectionCheckbox,
  isAdaptTableGroupRow,
} from "./grouping";

const GROUP_KEY = "group:team:Core";
const LEAF_IDS = ["1", "2"] as const;
const labels = defaultLabels;

const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

function makeGroup(
  overrides: Partial<AdaptTableGroupRow> = {}
): AdaptTableGroupRow {
  return {
    [ADAPTTABLE_GROUP]: true,
    key: GROUP_KEY,
    label: "Core",
    leafIds: LEAF_IDS,
    collapsed: false,
    ...overrides,
  };
}

function makeSelection(
  selectedIds: readonly string[],
  overrides: Partial<SelectionState> = {}
): SelectionState {
  const selected = new Set(selectedIds);
  return {
    selectedIds: selected,
    selectedCount: selectedIds.length,
    headerState: "none",
    isSelected: (id) => selected.has(id),
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    toggleGroupLeaves: vi.fn(),
    clear: vi.fn(),
    visibleIds: [...LEAF_IDS, "3"],
    allMatching: false,
    selectAllMatching: vi.fn(),
    ...overrides,
  };
}

describe("grouping helpers (antd)", () => {
  it("builds grouped dataSource records and resolves row keys", () => {
    const entries = [
      {
        kind: "group" as const,
        key: GROUP_KEY,
        value: "Core",
        label: "Core",
        leafRows: [],
        leafIds: LEAF_IDS,
        collapsed: false,
      },
      {
        kind: "row" as const,
        key: "1",
        row: { id: "1", team: "Core", name: "Ada" },
        index: 0,
        groupKey: GROUP_KEY,
      },
    ];
    const dataSource = buildGroupedDataSource(entries);
    expect(isAdaptTableGroupRow(dataSource[0])).toBe(true);
    expect(groupedRowKey(dataSource[0]!, (r) => r.id)).toBe(GROUP_KEY);
    expect(
      groupedRowKey(
        dataSource[1] as { id: string; team: string; name: string },
        (r) => r.id
      )
    ).toBe("1");
  });
});

describe("GroupHeaderCell (antd)", () => {
  it("renders toggle, label, count, and optional aggregate", () => {
    const onToggle = vi.fn();
    renderAntd(
      <GroupHeaderCell
        group={makeGroup({ collapsed: true })}
        labels={labels}
        onToggle={onToggle}
        aggregate={<span>agg</span>}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="group-row"]')
    ).toBeInTheDocument();
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(
      screen.getByText(labels.groupCount(LEAF_IDS.length))
    ).toBeInTheDocument();
    expect(screen.getByText("agg")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: labels.expandGroup }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("uses collapse label when expanded", () => {
    renderAntd(
      <GroupHeaderCell
        group={makeGroup({ collapsed: false })}
        labels={labels}
        onToggle={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: labels.collapseGroup })
    ).toHaveAttribute("aria-expanded", "true");
  });
  it("omits aggregate content when absent or false", () => {
    renderAntd(
      <GroupHeaderCell
        group={makeGroup()}
        labels={labels}
        onToggle={vi.fn()}
        aggregate={false}
      />
    );
    expect(screen.queryByText("agg")).toBeNull();
  });
});

describe("GroupSelectionCheckbox (antd)", () => {
  it("reflects tri-state selection and toggles group leaves", () => {
    const selection = makeSelection(["1"]);
    renderAntd(
      <GroupSelectionCheckbox
        group={makeGroup()}
        selection={selection}
        labels={labels}
      />
    );
    const checkbox = screen.getByRole("checkbox", {
      name: `${labels.selectAll}: Core`,
    });
    expect(checkbox).toHaveProperty("indeterminate", true);
    fireEvent.click(checkbox);
    expect(selection.toggleGroupLeaves).toHaveBeenCalledWith(LEAF_IDS);
  });
});

describe("GroupHeaderCard (antd)", () => {
  it("renders without selection", () => {
    renderAntd(
      <GroupHeaderCard group={makeGroup()} labels={labels} onToggle={vi.fn()} />
    );
    expect(part("group-card")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("renders mobile group card with selection and toggle", () => {
    const onToggle = vi.fn();
    const selection = makeSelection(LEAF_IDS);
    renderAntd(
      <GroupHeaderCard
        group={makeGroup({ collapsed: true })}
        labels={labels}
        onToggle={onToggle}
        selection={selection}
        aggregateNodes={<span>sum</span>}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="group-card"]')
    ).toBeInTheDocument();
    expect(screen.getByText("sum")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: labels.expandGroup }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: `${labels.selectAll}: Core`,
      })
    );
    expect(selection.toggleGroupLeaves).toHaveBeenCalledWith(LEAF_IDS);
  });
});
