import type { GroupedFlatEntry } from "@adapttable/core";
import type { SelectionState } from "@adapttable/react";

import type { ColumnDef } from "@adapttable/react";

import { Table } from "@radix-ui/themes";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "../index";
import { renderRadix } from "../test-utils";
import { GroupHeaderCard, GroupHeaderRow } from "./GroupHeader";

interface Row {
  id: string;
  team: string;
  name: string;
}

type GroupEntry = Extract<GroupedFlatEntry<Row>, { kind: "group" }>;

const LABEL_CELL = '[data-adapttable-part="group-cell"]';
const CELL_TAG = "td";

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
];

const GROUP_KEY = "group:team:Core";
const LEAF_IDS = ["1", "2"] as const;
const labels = defaultLabels;

function makeGroupEntry(overrides: Partial<GroupEntry> = {}): GroupEntry {
  return {
    kind: "group",
    level: 0,
    groupBy: "team",
    path: ["s:Core"],
    key: GROUP_KEY,
    value: "Core",
    label: "Core",
    leafRows: [{ id: "1", team: "Core", name: "Ada" }],
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
    replace: vi.fn(),
    visibleIds: [...LEAF_IDS, "3"],
    allMatching: false,
    selectAllMatching: vi.fn(),
    acrossPages: true,
    ...overrides,
  };
}

function renderRow(
  props: Partial<Parameters<typeof GroupHeaderRow<Row>>[0]> = {}
) {
  const onToggleCollapse = props.onToggleCollapse ?? vi.fn();
  renderRadix(
    <Table.Root>
      <Table.Body>
        <GroupHeaderRow
          entry={makeGroupEntry()}
          columns={COLUMNS}
          leadingCells={0}
          showActions={false}
          getCellProps={() => ({})}
          selection={null}
          labels={labels}
          onToggleCollapse={onToggleCollapse}
          onShowMore={() => undefined}
          {...props}
        />
      </Table.Body>
    </Table.Root>
  );
  return { onToggleCollapse };
}

describe("GroupHeaderRow (radix)", () => {
  it("puts a subtotal in its own column's cell, not the label's", () => {
    // The defect this replaced: every aggregate lived inside one spanning cell
    // and was pushed to the row's end, which on a scrolling table is past the
    // right edge of what the user can see.
    renderRow({
      columns: COLUMNS,
      entry: makeGroupEntry({ aggregateCells: { team: <span>$99</span> } }),
    });
    const label = document.querySelector(LABEL_CELL);
    const cells = [...document.querySelectorAll(CELL_TAG)];
    const aggregate = document.querySelector(
      '[data-adapttable-part="group-aggregate"][data-column="team"]'
    );
    // The label spans the columns before it; the number sits in a later cell.
    expect(label).toHaveAttribute("colspan", "1");
    expect(aggregate).toHaveTextContent("$99");
    expect(label?.contains(aggregate ?? null)).toBe(false);
    expect(cells).toHaveLength(2);
  });

  it("renders label, count, aggregates, and group hooks", () => {
    renderRow({
      entry: makeGroupEntry({
        aggregateCells: { name: <span>agg</span> },
      }),
    });
    expect(
      document.querySelector('[data-adapttable-part="group-row"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="group-cell"]')
    ).toBeInTheDocument();
    expect(screen.getByText("Core")).toHaveAttribute(
      "data-adapttable-part",
      "group-label"
    );
    expect(
      screen.getByText(labels.groupCount(LEAF_IDS.length))
    ).toHaveAttribute("data-adapttable-part", "group-count");
    expect(
      document.querySelector(
        '[data-adapttable-part="group-aggregate"][data-column="name"]'
      )
    ).toHaveTextContent("agg");
  });

  it("calls onToggleCollapse when collapsed", () => {
    const { onToggleCollapse } = renderRow({
      entry: makeGroupEntry({ collapsed: true }),
    });
    const toggle = screen.getByRole("button", { name: labels.expandGroup });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(onToggleCollapse).toHaveBeenCalledWith(GROUP_KEY);
  });

  it("uses collapse label when expanded", () => {
    renderRow({ entry: makeGroupEntry({ collapsed: false }) });
    expect(
      screen.getByRole("button", { name: labels.collapseGroup })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("omits the group checkbox without selection", () => {
    renderRow({ selection: null });
    expect(
      document.querySelector('[data-adapttable-part="group-select"]')
    ).toBeNull();
  });

  it("reflects tri-state selection and toggles group leaves", () => {
    const selection = makeSelection(["1"]);
    renderRow({ selection });
    const checkbox = screen.getByRole("checkbox", { name: labels.selectAll });
    expect(checkbox).toBePartiallyChecked();
    fireEvent.click(checkbox);
    expect(selection.toggleGroupLeaves).toHaveBeenCalledWith(LEAF_IDS);

    const all = makeSelection(LEAF_IDS);
    renderRow({ selection: all });
    expect(
      screen.getAllByRole("checkbox", { name: labels.selectAll })[1]
    ).toBeChecked();
  });
});

describe("GroupHeaderCard (radix)", () => {
  it("renders the mobile group card", () => {
    const onToggleCollapse = vi.fn();
    const selection = makeSelection(LEAF_IDS);
    renderRadix(
      <GroupHeaderCard
        columns={COLUMNS}
        entry={makeGroupEntry({ collapsed: true })}
        selection={selection}
        labels={labels}
        onToggleCollapse={onToggleCollapse}
        onShowMore={() => undefined}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="group-card"]')
    ).toHaveAttribute("data-collapsed", "true");
    fireEvent.click(screen.getByRole("button", { name: labels.expandGroup }));
    expect(onToggleCollapse).toHaveBeenCalledWith(GROUP_KEY);
    fireEvent.click(screen.getByRole("checkbox", { name: labels.selectAll }));
    expect(selection.toggleGroupLeaves).toHaveBeenCalledWith(LEAF_IDS);
  });
});
