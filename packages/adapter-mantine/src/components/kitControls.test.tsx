import type {
  BatchEditingState,
  QueryFilterGroup,
  RowEditingState,
} from "@adapttable/core";
import type { RowReorderState } from "@adapttable/core/adapter";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
  type FilterValue,
} from "../index";
import { renderMantine } from "../test-utils";
import { ChecklistFilter } from "./ChecklistFilter";
import { FilterTreeBuilder } from "./FilterTreeBuilder";
import {
  BatchEditBar,
  ColumnGroupToggle,
  editableCellSlots,
  FilterHeaderControl,
  FilterHeaderRow,
  FilterHeaderTrigger,
  FindBar,
  GroupMoreButton,
  RowEditActions,
  RowReorderButtons,
  RowReorderHandle,
  TreeCell,
  TreeToggle,
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
          classNames={{
            filterHeaderRow: "row-cls",
            filterHeaderCell: "cell-cls",
            filterHeaderInput: "input-cls",
            filterHeaderMenu: "menu-cls",
          }}
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

describe("kit header filters (mantine)", () => {
  it("writes every compact header widget", async () => {
    renderMantine(<HeaderHarness />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada" },
    });
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "Web" },
    });
    expect(screen.getByLabelText("Team")).toHaveValue("Web");
    fireEvent.click(screen.getByLabelText("Tags"));
    const firstTag = await screen.findByRole("checkbox", { name: "A" });
    fireEvent.click(firstTag);
    expect(firstTag).toBeChecked();
    expect(screen.getByLabelText("Tags")).toHaveTextContent("A");
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
    renderMantine(
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
          className="control-cls"
        />
      );
    }
    renderMantine(<One />);
    fireEvent.change(screen.getByLabelText("Team"), {
      target: { value: "Core" },
    });
    expect(screen.getByLabelText("Team")).toHaveValue("Core");
  });
});

const pickSelect = (name: string, optionLabel: string) => {
  fireEvent.click(screen.getByRole("combobox", { name }));
  fireEvent.click(screen.getByRole("option", { name: optionLabel }));
};

describe("kit filter tree (mantine)", () => {
  it("adds a condition and writes the value", () => {
    renderMantine(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    fireEvent.change(screen.getByLabelText("Value"), {
      target: { value: "Ada" },
    });
    expect(screen.getByRole("combobox", { name: "Field" })).toHaveValue("Name");
    expect(screen.getByLabelText("Value")).toHaveValue("Ada");
  });

  it("switches field, operator, and a relative date", () => {
    renderMantine(<TreeHarness />);
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

  it("nests a group, flips the combinator, and removes both", () => {
    renderMantine(<TreeHarness />);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("button", { name: "Add condition" }));
    pickSelect("Advanced", "OR");
    fireEvent.click(screen.getByRole("button", { name: "Add group" }));
    expect(screen.getAllByRole("combobox", { name: "Advanced" })).toHaveLength(
      2
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove condition" }));
    expect(screen.getByRole("button", { name: "Add condition" })).toBeVisible();
  });
});

describe("kit affordances (mantine)", () => {
  it("renders both sides of the chevron, group, find, and edit slots", () => {
    const parent = {
      row: { name: "src" },
      key: "src",
      level: 0,
      hasChildren: true,
      expanded: true,
      path: [],
      descendantIds: ["a"],
      loading: true,
    };
    const leaf = {
      row: { name: "readme" },
      key: "readme",
      level: 1,
      hasChildren: false,
      expanded: false,
      path: ["src"],
      descendantIds: [],
    };
    const find = {
      open: true,
      setOpen: () => undefined,
      query: "x",
      setQuery: () => undefined,
      matches: [] as { row: number; col: number }[],
      matchKeys: new Set<string>(),
      index: -1,
      current: null,
      next: () => undefined,
      previous: () => undefined,
    };
    const Activate = editableCellSlots.Activate;
    const Button = editableCellSlots.Button;
    const reorder = {
      isLifted: (id: string) => id === "1",
      dragProps: () => ({
        draggable: true as const,
        onDragStart: () => undefined,
        onDragEnd: () => undefined,
      }),
      handleKeyDown: () => undefined,
      moveBy: () => undefined,
    } as unknown as RowReorderState<{ name: string }>;
    const reorderLabels = {
      reorderRow: "Reorder row",
      moveRowUp: "Move row up",
      moveRowDown: "Move row down",
      rowLifted: () => "",
      rowMoved: () => "",
      rowReorderCancelled: "",
    };
    const rowEditing = {
      isEditing: (id: string) => id === "edit",
      begin: () => undefined,
      save: () => undefined,
      cancel: () => undefined,
      isDirty: true,
    } as unknown as RowEditingState<{ name: string }>;
    const batch = {
      pending: true,
      count: 2,
      saveAll: () => undefined,
      cancelAll: () => undefined,
    } as unknown as BatchEditingState<{ name: string }>;
    renderMantine(
      <>
        <TreeToggle
          entry={parent}
          onToggle={() => undefined}
          toggleClassName="toggle-cls"
        />
        <TreeToggle
          entry={{ ...parent, expanded: false, loading: false }}
          onToggle={() => undefined}
        />
        <TreeToggle
          entry={leaf}
          onToggle={() => undefined}
          spacerClassName="spacer-cls"
        />
        <TreeCell
          entry={parent}
          columnKey="name"
          treeColumnKey="name"
          onToggle={() => undefined}
          className="cell-cls"
          toggleClassName="toggle-cls"
        >
          src
        </TreeCell>
        <ColumnGroupToggle
          cell={{
            key: "g",
            label: "Meta",
            span: 2,
            id: "g",
            collapsed: true,
            collapsible: true,
            hideLabel: false,
          }}
          labels={defaultLabels}
          onToggle={() => undefined}
          className="group-cls"
        />
        <ColumnGroupToggle
          cell={{
            key: "g2",
            label: "Meta",
            span: 2,
            id: "g2",
            collapsed: false,
            collapsible: true,
            hideLabel: false,
          }}
          labels={defaultLabels}
          onToggle={() => undefined}
        />
        <ColumnGroupToggle
          cell={{
            key: "gap",
            label: null,
            span: 1,
            id: null,
            collapsed: false,
            collapsible: false,
            hideLabel: false,
          }}
          labels={defaultLabels}
          onToggle={() => undefined}
        />
        <GroupMoreButton
          scope="groups"
          remaining={3}
          labels={defaultLabels}
          onShowMore={() => undefined}
        />
        <GroupMoreButton
          scope="rows"
          remaining={2}
          groupKey="core"
          labels={defaultLabels}
          onShowMore={() => undefined}
        />
        <FindBar find={find} labels={defaultLabels} className="find-cls" />
        <FindBar
          find={{
            ...find,
            matches: [{ row: 0, col: 0 }],
            index: 0,
            current: { row: 0, col: 0 },
          }}
          labels={defaultLabels}
        />
        <Activate
          title="Edit"
          className="activate-cls"
          saveStatus="saving"
          dirty
          activateRef={() => undefined}
          display="Ada"
          onDoubleClick={() => undefined}
          onClick={() => undefined}
          onKeyDown={() => undefined}
        />
        <Activate
          title="Edit"
          saveStatus="idle"
          dirty={false}
          activateRef={() => undefined}
          display="Ada"
          onDoubleClick={() => undefined}
          onClick={() => undefined}
          onKeyDown={() => undefined}
        />
        <Button
          label="Undo"
          part="edit-cell-rollback"
          className="undo-cls"
          onMouseDown={() => undefined}
          onClick={() => undefined}
        />
        <RowReorderHandle
          reorder={reorder}
          labels={reorderLabels}
          rowId="1"
          localIndex={0}
          row={{ name: "a" }}
          windowStart={0}
          rowCount={2}
          className="handle-cls"
        />
        <RowReorderHandle
          reorder={reorder}
          labels={reorderLabels}
          rowId="2"
          localIndex={1}
          row={{ name: "b" }}
          windowStart={0}
          rowCount={2}
        />
        <RowReorderButtons
          reorder={reorder}
          labels={reorderLabels}
          localIndex={0}
          row={{ name: "a" }}
          windowStart={0}
          rowCount={2}
          className="buttons-cls"
          upClassName="up-cls"
          downClassName="down-cls"
        />
        <RowReorderButtons
          reorder={reorder}
          labels={reorderLabels}
          localIndex={1}
          row={{ name: "b" }}
          windowStart={0}
          rowCount={2}
        />
        <RowEditActions
          rowEditing={rowEditing}
          row={{ name: "a" }}
          rowId="idle"
          className="actions-cls"
          buttonClassName="btn-cls"
        />
        <RowEditActions
          rowEditing={rowEditing}
          row={{ name: "a" }}
          rowId="edit"
          buttonClassName="btn-cls"
        />
        <BatchEditBar
          batch={batch}
          labels={defaultLabels}
          className="batch-cls"
          buttonClassName="batch-btn-cls"
        />
        <BatchEditBar
          batch={{ ...batch, pending: false, count: 0 }}
          labels={defaultLabels}
        />
      </>
    );
    expect(screen.getAllByLabelText("Collapse row")[0]).toHaveAttribute(
      "aria-busy",
      "true"
    );
    expect(screen.getByLabelText("Expand column group: Meta")).toBeVisible();
    expect(screen.getByLabelText("Collapse column group: Meta")).toBeVisible();
    expect(screen.getByText("Show 3 more groups")).toBeVisible();
    expect(screen.getByText("Show 2 more in this group")).toBeVisible();
    expect(screen.getAllByLabelText("Find in table").length).toBeGreaterThan(0);
    expect(screen.getByText("Undo")).toBeVisible();
    fireEvent.click(screen.getAllByLabelText("Previous match")[0]!);
    fireEvent.click(screen.getAllByLabelText("Next match")[0]!);
    fireEvent.click(screen.getAllByLabelText("Close find")[0]!);
    fireEvent.click(screen.getAllByLabelText("Reorder row")[0]!);
    fireEvent.click(screen.getAllByLabelText("Move row up")[0]!);
    fireEvent.click(screen.getAllByLabelText("Move row down")[0]!);
    fireEvent.click(screen.getByLabelText("Edit row"));
    fireEvent.click(screen.getByLabelText("Save row"));
    fireEvent.click(screen.getByLabelText("Cancel"));
    fireEvent.click(screen.getByText("Save all"));
    fireEvent.click(screen.getByText("Cancel all"));
  });

  it("drives the checklist search, select-all, and clear slots", () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      team: index % 2 === 0 ? "Core" : "Web",
    }));
    function List() {
      const [extra, setExtra] = useState<ExtraFilters>({});
      return (
        <ChecklistFilter
          def={{
            key: "team",
            type: "checklist",
            getValue: (row: { team: string }) => row.team,
          }}
          source={{
            extra,
            setExtra: (key, value) =>
              setExtra((prev) => ({ ...prev, [key]: value })),
            allFilteredRows: rows,
          }}
          labels={defaultLabels}
          classNames={{
            filterChecklistSearch: "search-cls",
            filterCheckbox: "box-cls",
            filterChecklistCount: "count-cls",
          }}
        />
      );
    }
    renderMantine(<List />);
    fireEvent.change(screen.getByLabelText("Search values"), {
      target: { value: "Co" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Core/ }));
    expect(screen.getByRole("checkbox", { name: /Core/ })).toBeChecked();
  });
});

/**
 * The funnel on a column header claims "this column is filtered". A funnel that
 * lights up for a value the user cleared is worse than no funnel at all, so the
 * emptiness rules are asserted one shape at a time rather than trusted.
 */
describe("kit header filter trigger (mantine)", () => {
  const trigger = () =>
    document.querySelector('[data-adapttable-part="filter-header-trigger"]')!;

  it("stays quiet with no filter at all", () => {
    renderMantine(<TriggerHarness />);

    expect(trigger()).not.toHaveAttribute("data-active");
  });

  it.each([
    ["an empty string", ""],
    ["a null", null],
    ["an empty array", [] as string[]],
  ])("treats %s as no filter", (_name, value) => {
    renderMantine(<TriggerHarness extra={{ name: value as FilterValue }} />);

    expect(trigger()).not.toHaveAttribute("data-active");
  });

  it.each([
    ["a typed value", "Ada"],
    ["a non-empty array", ["a"] as string[]],
  ])("marks itself active for %s", (_name, value) => {
    renderMantine(<TriggerHarness extra={{ name: value as FilterValue }} />);

    expect(trigger()).toHaveAttribute("data-active");
  });

  it("opens the column's own filter field", () => {
    renderMantine(<TriggerHarness />);
    fireEvent.click(trigger());

    expect(
      document.querySelector('[data-adapttable-part="filter-header-cell"]')
    ).not.toBeNull();
  });
});

describe("kit multi-select header widget (mantine)", () => {
  const openTags = () => {
    renderMantine(<HeaderHarness extra={{ tags: ["a"] }} />);
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
