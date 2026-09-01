import {
  type ColumnDef,
  defaultLabels,
  type GroupedFlatEntry,
  type SelectionState,
} from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  render(
    <table>
      <tbody>
        <GroupHeaderRow
          entry={makeGroupEntry()}
          columns={COLUMNS}
          leadingCells={0}
          showActions={false}
          getCellProps={() => ({})}
          selection={null}
          labels={labels}
          classNames={{}}
          onToggleCollapse={onToggleCollapse}
          onShowMore={() => undefined}
          {...props}
        />
      </tbody>
    </table>
  );
  return { onToggleCollapse };
}

describe("GroupHeaderRow (unstyled)", () => {
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

  it("renders label, count, and data-adapttable-part hooks", () => {
    renderRow({
      entry: makeGroupEntry({
        aggregateCells: { name: <span>agg</span> },
      }),
    });
    expect(
      document.querySelector('[data-adapttable-part="group-row"]')
    ).toBeInTheDocument();
    // The label cell keeps only the columns before the first aggregate — the
    // first column here — so every number after it has a cell of its own.
    expect(
      document.querySelector('[data-adapttable-part="group-cell"]')
    ).toHaveAttribute("colspan", "1");
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

  it("calls onToggleCollapse with the group key", () => {
    const { onToggleCollapse } = renderRow();
    fireEvent.click(
      document.querySelector('[data-adapttable-part="group-toggle"]')!
    );
    expect(onToggleCollapse).toHaveBeenCalledWith(GROUP_KEY);
  });

  it("uses expand aria-label when collapsed", () => {
    renderRow({ entry: makeGroupEntry({ collapsed: true }) });
    expect(
      screen.getByRole("button", { name: labels.expandGroup })
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      document.querySelector('[data-adapttable-part="group-row"]')
    ).toHaveAttribute("data-collapsed", "true");
  });

  it("uses collapse aria-label when expanded", () => {
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

  it("reflects all / some / none selection and toggles group leaves", () => {
    const none = makeSelection([]);
    render(
      <table>
        <tbody>
          <GroupHeaderRow
            entry={makeGroupEntry()}
            columns={COLUMNS}
            leadingCells={0}
            showActions={false}
            getCellProps={() => ({})}
            selection={none}
            labels={labels}
            classNames={{}}
            onToggleCollapse={vi.fn()}
            onShowMore={() => undefined}
          />
        </tbody>
      </table>
    );
    const checkbox = screen.getByRole("checkbox", { name: labels.selectAll });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toBePartiallyChecked();
    fireEvent.click(checkbox);
    expect(none.toggleGroupLeaves).toHaveBeenCalledWith(LEAF_IDS);

    const all = makeSelection(LEAF_IDS);
    render(
      <table>
        <tbody>
          <GroupHeaderRow
            entry={makeGroupEntry()}
            columns={COLUMNS}
            leadingCells={0}
            showActions={false}
            getCellProps={() => ({})}
            selection={all}
            labels={labels}
            classNames={{}}
            onToggleCollapse={vi.fn()}
            onShowMore={() => undefined}
          />
        </tbody>
      </table>
    );
    expect(
      screen.getAllByRole("checkbox", { name: labels.selectAll })[1]
    ).toBeChecked();

    const some = makeSelection(["1"]);
    render(
      <table>
        <tbody>
          <GroupHeaderRow
            entry={makeGroupEntry()}
            columns={COLUMNS}
            leadingCells={0}
            showActions={false}
            getCellProps={() => ({})}
            selection={some}
            labels={labels}
            classNames={{}}
            onToggleCollapse={vi.fn()}
            onShowMore={() => undefined}
          />
        </tbody>
      </table>
    );
    expect(
      screen.getAllByRole("checkbox", { name: labels.selectAll })[2]
    ).toBePartiallyChecked();
  });
});

describe("GroupHeaderCard (unstyled)", () => {
  it("renders the mobile group card with toggle and count", () => {
    const onToggleCollapse = vi.fn();
    const selection = makeSelection(LEAF_IDS);
    render(
      <GroupHeaderCard
        columns={COLUMNS}
        entry={makeGroupEntry({ collapsed: true })}
        selection={selection}
        labels={labels}
        classNames={{}}
        onToggleCollapse={onToggleCollapse}
        onShowMore={() => undefined}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="group-card"]')
    ).toHaveAttribute("data-collapsed", "true");
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(
      screen.getByText(labels.groupCount(LEAF_IDS.length))
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: labels.expandGroup }));
    expect(onToggleCollapse).toHaveBeenCalledWith(GROUP_KEY);
    fireEvent.click(screen.getByRole("checkbox", { name: labels.selectAll }));
    expect(selection.toggleGroupLeaves).toHaveBeenCalledWith(LEAF_IDS);
  });
});
