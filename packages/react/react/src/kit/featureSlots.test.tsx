/**
 * The optional cell chrome a body draws. A table that composes no feature
 * shows the cell's own content and nothing else; a composed feature receives
 * that table's props and draws in the cell's place.
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { FeatureProviders, slotRender } from "../features/providers";
import {
  COLUMN_GROUP_TOGGLE,
  COLUMN_HEADER_RENAME,
  COLUMN_SELECT,
  EDITABLE_CELL,
  EXPAND_TOGGLE,
  FILL_HANDLE,
  FILTER_HEADER,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  TREE_CELL,
  TREE_TOGGLE,
} from "../features/slotKeys";
import {
  applyTableFeatures,
  type TableFeature,
} from "../features/tableFeature";
import {
  cellDisplay,
  OptionalColumnGroupToggle,
  OptionalColumnHeaderRename,
  OptionalColumnSelect,
  OptionalEditableCell,
  OptionalExpandToggle,
  OptionalFillHandle,
  OptionalFilterHeader,
  OptionalGroupHeaderCard,
  OptionalGroupHeaderRow,
  OptionalRowEditActions,
  OptionalRowReorderButtons,
  OptionalRowReorderHandle,
  OptionalTreeCell,
  OptionalTreeToggle,
} from "./featureSlots";

interface Row {
  id: string;
  name: string;
}

const row: Row = { id: "a", name: "Ada" };
const accessed: ColumnDef<Row> = {
  key: "name",
  header: "Name",
  accessor: (r) => r.name,
};
const drawn: ColumnDef<Row> = {
  key: "name",
  header: "Name",
  Cell: ({ row: r, rowIndex }) => (
    <b>
      {r.name}#{rowIndex}
    </b>
  ),
};

function mount(features: readonly TableFeature[], children: ReactNode) {
  return render(
    <FeatureProviders props={applyTableFeatures({ features })}>
      {children}
    </FeatureProviders>
  );
}

const cell = (column: ColumnDef<Row>) => (
  <OptionalEditableCell
    editing={undefined}
    row={row}
    column={column}
    rowId="a"
    rowIndex={3}
    rows={[row]}
    columns={[column]}
    rowKey={(r) => r.id}
    editLabel="Edit"
    undoLabel="Undo"
  />
);

describe("cellDisplay", () => {
  it("reads the accessor", () => {
    expect(cellDisplay(accessed, row, 0)).toBe("Ada");
  });

  it("draws the column's own cell with the row and its index", () => {
    render(<>{cellDisplay(drawn, row, 2)}</>);
    expect(screen.getByText("Ada#2").tagName).toBe("B");
  });
});

describe("optional cell chrome", () => {
  it("shows the cell's own content when no feature edits cells", () => {
    const { container } = mount([], cell(drawn));
    expect(container.textContent).toBe("Ada#3");
  });

  it("gives a composed editing feature the cell's props and its display", () => {
    const editing: TableFeature = {
      id: "editing",
      renders: [
        slotRender(EDITABLE_CELL, (props) => (
          <span data-testid="editor" data-row={props.rowId}>
            {props.display}
          </span>
        )),
      ],
    };
    mount([editing], cell(accessed));
    const editor = screen.getByTestId("editor");
    expect(editor).toHaveAttribute("data-row", "a");
    expect(editor).toHaveTextContent("Ada");
  });

  it("shows a tree cell's content bare when no feature draws the tree", () => {
    const { container } = mount(
      [],
      <OptionalTreeCell
        entry={undefined}
        columnKey="name"
        treeColumnKey="name"
        labels={{ expandRow: "Expand", collapseRow: "Collapse" }}
        onToggle={() => undefined}
      >
        Ada
      </OptionalTreeCell>
    );
    expect(container.textContent).toBe("Ada");
  });

  it("draws nothing for a control whose feature is not composed", () => {
    const { container } = mount(
      [],
      <OptionalExpandToggle
        id="a"
        expanded={false}
        onToggle={() => undefined}
        expandLabel="Expand"
        collapseLabel="Collapse"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("draws a composed control with the row it belongs to", () => {
    const detail: TableFeature = {
      id: "row-detail",
      renders: [
        slotRender(EXPAND_TOGGLE, (props) => (
          <button type="button" aria-expanded={props.expanded}>
            {props.expanded ? props.collapseLabel : props.expandLabel}
          </button>
        )),
        slotRender(TREE_CELL, () => null),
      ],
    };
    mount(
      [detail],
      <OptionalExpandToggle
        id="a"
        expanded
        onToggle={() => undefined}
        expandLabel="Expand"
        collapseLabel="Collapse"
      />
    );
    expect(screen.getByRole("button", { name: "Collapse" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});

describe("optional control slots", () => {
  /** A wrapper's props carrying only a marker the composed fill reads back. */
  const marked = <TProps,>(marker: string) => ({ marker }) as unknown as TProps;
  /** Each wrapper with the slot it hands to a composed feature. */
  const WRAPPERS: readonly [
    name: string,
    slot: unknown,
    draw: (marker: string) => ReactNode,
  ][] = [
    [
      "TreeToggle",
      TREE_TOGGLE,
      (m) => (
        <OptionalTreeToggle
          {...marked<Parameters<typeof OptionalTreeToggle>[0]>(m)}
        />
      ),
    ],
    [
      "FillHandle",
      FILL_HANDLE,
      (m) => (
        <OptionalFillHandle
          {...marked<Parameters<typeof OptionalFillHandle>[0]>(m)}
        />
      ),
    ],
    [
      "FilterHeader",
      FILTER_HEADER,
      (m) => (
        <OptionalFilterHeader
          {...marked<Parameters<typeof OptionalFilterHeader>[0]>(m)}
        />
      ),
    ],
    [
      "RowEditActions",
      ROW_EDIT_ACTIONS,
      (m) => (
        <OptionalRowEditActions
          {...marked<Parameters<typeof OptionalRowEditActions>[0]>(m)}
        />
      ),
    ],
    [
      "RowReorderHandle",
      ROW_REORDER_HANDLE,
      (m) => (
        <OptionalRowReorderHandle
          {...marked<Parameters<typeof OptionalRowReorderHandle>[0]>(m)}
        />
      ),
    ],
    [
      "RowReorderButtons",
      ROW_REORDER_BUTTONS,
      (m) => (
        <OptionalRowReorderButtons
          {...marked<Parameters<typeof OptionalRowReorderButtons>[0]>(m)}
        />
      ),
    ],
    [
      "ColumnGroupToggle",
      COLUMN_GROUP_TOGGLE,
      (m) => (
        <OptionalColumnGroupToggle
          {...marked<Parameters<typeof OptionalColumnGroupToggle>[0]>(m)}
        />
      ),
    ],
    [
      "ColumnHeaderRename",
      COLUMN_HEADER_RENAME,
      (m) => (
        <OptionalColumnHeaderRename
          {...marked<Parameters<typeof OptionalColumnHeaderRename>[0]>(m)}
        />
      ),
    ],
    [
      "ColumnSelect",
      COLUMN_SELECT,
      (m) => (
        <OptionalColumnSelect
          {...marked<Parameters<typeof OptionalColumnSelect>[0]>(m)}
        />
      ),
    ],
    [
      "GroupHeaderRow",
      GROUP_HEADER_ROW,
      (m) => (
        <OptionalGroupHeaderRow
          {...marked<Parameters<typeof OptionalGroupHeaderRow>[0]>(m)}
        />
      ),
    ],
    [
      "GroupHeaderCard",
      GROUP_HEADER_CARD,
      (m) => (
        <OptionalGroupHeaderCard
          {...marked<Parameters<typeof OptionalGroupHeaderCard>[0]>(m)}
        />
      ),
    ],
  ];

  for (const [name, slot, draw] of WRAPPERS) {
    it(`${name}: draws nothing alone, and the composed feature with the props it was given`, () => {
      const alone = mount([], draw(name));
      expect(alone.container).toBeEmptyDOMElement();
      alone.unmount();
      const feature: TableFeature = {
        id: name,
        renders: [
          slotRender(slot as never, (props: unknown) => (
            <span data-testid="fill">
              {(props as { marker: string }).marker}
            </span>
          )),
        ],
      };
      mount([feature], draw(name));
      expect(screen.getByTestId("fill")).toHaveTextContent(name);
    });
  }
});
