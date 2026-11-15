/**
 * The rest of the feature controls a kit gets from its primitives: the batch
 * bar, the approval strip, tree cells, column-group and group-paging
 * controls, the row move buttons and the header filter row. Each test draws
 * one factory's component with the native test set and checks what a person
 * meets and that every control reaches the state it belongs to.
 */

import {
  type AgentApprovalPending,
  type BatchEditingState,
  defaultLabels,
  type HeaderGroupCell,
} from "@adapttable/core/binding";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { testPrimitives } from "../internal/testPrimitives";
import type { RowReorderLabels, RowReorderState } from "../rows/rowReorder";
import {
  createAgentApproval,
  createBatchEditBar,
  createColumnGroupToggle,
  createFilterHeaderRow,
  createGroupMoreButton,
  createRowReorderButtons,
  createTreeCell,
} from "./controls";

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("createBatchEditBar", () => {
  const BatchEditBar = createBatchEditBar(testPrimitives);

  it("counts the waiting rows and saves or discards them all", () => {
    const saveAll = vi.fn();
    const cancelAll = vi.fn();
    const batch = {
      pending: true,
      count: 2,
      saveAll,
      cancelAll,
    } as unknown as BatchEditingState<unknown>;
    render(<BatchEditBar batch={batch} labels={defaultLabels} />);
    expect(part("batch-edit-count")).toHaveTextContent("2");
    fireEvent.click(part("batch-edit-save")!);
    fireEvent.click(part("batch-edit-cancel")!);
    expect(saveAll).toHaveBeenCalledOnce();
    expect(cancelAll).toHaveBeenCalledOnce();
  });

  it("draws nothing while no row waits", () => {
    const batch = {
      pending: false,
      count: 0,
    } as unknown as BatchEditingState<unknown>;
    render(<BatchEditBar batch={batch} />);
    expect(part("batch-edit-bar")).toBeNull();
  });
});

describe("createAgentApproval", () => {
  const AgentApproval = createAgentApproval(testPrimitives);

  it("lists the proposed change and sends each decision to the session", () => {
    const pending: AgentApprovalPending = {
      presentation: "table",
      proposals: [
        {
          rowKey: "1",
          rowLabel: "Ada",
          column: "name",
          columnLabel: "Name",
          before: "Ada",
          after: "Ada L.",
        },
      ],
      decisions: ["pending"],
      approve: vi.fn(),
      reject: vi.fn(),
      decideAt: vi.fn(),
      alwaysAllow: vi.fn(),
    };
    render(<AgentApproval pending={pending} labels={defaultLabels} />);
    expect(part("agent-approval")).not.toBeNull();
    expect(part("agent-approval-list")?.tagName).toBe("UL");
    fireEvent.click(part("agent-approval-approve")!);
    fireEvent.click(part("agent-approval-reject")!);
    expect(pending.approve).toHaveBeenCalledOnce();
    expect(pending.reject).toHaveBeenCalledOnce();
  });
});

describe("createTreeCell", () => {
  const TreeCell = createTreeCell(testPrimitives);
  const entry = {
    row: { id: "a" },
    key: "a",
    level: 2,
    hasChildren: true,
    expanded: false,
    loading: false,
    path: [],
    descendantIds: [],
  };

  it("indents the tree column and opens the row from its toggle", () => {
    const onToggle = vi.fn();
    render(
      <TreeCell
        entry={entry}
        columnKey="name"
        treeColumnKey="name"
        labels={defaultLabels}
        onToggle={onToggle}
      >
        Ada
      </TreeCell>
    );
    expect(screen.getByText("Ada")).toBeInTheDocument();
    const toggle = part("tree-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle!);
    expect(onToggle).toHaveBeenCalledWith("a");
  });

  it("leaves every other column as its plain content", () => {
    render(
      <TreeCell
        entry={entry}
        columnKey="team"
        treeColumnKey="name"
        labels={defaultLabels}
      >
        Core
      </TreeCell>
    );
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(part("tree-toggle")).toBeNull();
  });
});

describe("createColumnGroupToggle", () => {
  const ColumnGroupToggle = createColumnGroupToggle(testPrimitives);

  it("names the group it collapses and reports the group's id", () => {
    const onToggle = vi.fn();
    const cell = {
      id: "contact",
      label: "Contact",
      collapsible: true,
      collapsed: false,
    } as unknown as HeaderGroupCell;
    render(
      <ColumnGroupToggle
        cell={cell}
        labels={defaultLabels}
        onToggle={onToggle}
      />
    );
    const toggle = part("column-group-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName(/Contact/);
    fireEvent.click(toggle!);
    expect(onToggle).toHaveBeenCalledWith("contact");
  });
});

describe("createGroupMoreButton", () => {
  const GroupMoreButton = createGroupMoreButton(testPrimitives);

  it("offers the hidden groups and asks for the next page of them", () => {
    const onShowMore = vi.fn();
    render(
      <GroupMoreButton
        scope="groups"
        remaining={3}
        labels={defaultLabels}
        onShowMore={onShowMore}
      />
    );
    const more = part("group-more");
    expect(more).toHaveTextContent(defaultLabels.moreGroups(3));
    fireEvent.click(more!);
    expect(onShowMore).toHaveBeenCalledWith({
      scope: "groups",
      groupKey: undefined,
    });
  });
});

describe("createRowReorderButtons", () => {
  const RowReorderButtons = createRowReorderButtons(testPrimitives);
  const labels: RowReorderLabels = {
    reorderRow: "Reorder row",
    moveRowUp: "Move row up",
    moveRowDown: "Move row down",
    rowLifted: () => "",
    rowMoved: () => "",
    rowReorderCancelled: "",
    confirmRowMoveTitle: "Move row?",
    confirmRowMoveDescription: (row, from, to) => `${row}: ${from} to ${to}`,
    confirmRowMove: "Move",
    cancel: "Keep",
  };
  const row = { name: "Ship" };

  function reorder(
    over: Partial<RowReorderState<typeof row>> = {}
  ): RowReorderState<typeof row> {
    return {
      lifted: null,
      overIndex: null,
      overPosition: null,
      pendingMove: null,
      hostConfirmPending: false,
      announcement: "",
      isLifted: () => false,
      dragProps: () => ({
        draggable: true,
        onDragStart: () => undefined,
        onDragEnd: () => undefined,
      }),
      dropProps: () => ({
        onDragOver: () => undefined,
        onDrop: () => undefined,
      }),
      handleKeyDown: () => undefined,
      moveBy: vi.fn(),
      moveMenu: () => undefined,
      selectMoveTarget: () => undefined,
      confirmMove: () => undefined,
      cancelMove: () => undefined,
      rowAttrs: () => ({}),
      ...over,
    };
  }

  it("moves the row one place up or down and stops at the ends", () => {
    const state = reorder();
    render(
      <RowReorderButtons
        reorder={state}
        labels={labels}
        localIndex={0}
        row={row}
        windowStart={0}
        rowCount={2}
      />
    );
    const up = screen.getByRole("button", { name: "Move row up" });
    const down = screen.getByRole("button", { name: "Move row down" });
    expect(up).toBeDisabled();
    expect(up).toHaveTextContent("↑");
    fireEvent.click(down);
    expect(state.moveBy).toHaveBeenCalledWith(0, 1, row, 0, 2);
  });

  it("keeps the row where it is when the reader cancels a pending move", () => {
    const cancelMove = vi.fn();
    const state = reorder({
      pendingMove: {
        kind: "group",
        row,
        rowLabel: "Ship",
        fromGroup: { id: "core", label: "Core", levels: [] },
        toGroup: { id: "docs", label: "Docs", levels: [] },
        position: 0,
      },
      moveMenu: () => ({
        kind: "group",
        label: "Move row",
        targets: [{ id: "docs", label: "Move to Docs" }],
      }),
      cancelMove,
    });
    render(
      <RowReorderButtons
        reorder={state}
        labels={labels}
        localIndex={1}
        row={row}
        windowStart={0}
        rowCount={3}
      />
    );
    expect(screen.getByRole("button", { name: "Move row up" })).toBeDisabled();
    const dialog = part("row-move-confirmation")!;
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep" }));
    expect(cancelMove).toHaveBeenCalledOnce();
  });
});

describe("createFilterHeaderRow", () => {
  const FilterHeaderRow = createFilterHeaderRow(testPrimitives);

  it("puts each column's filter under its header and writes what the reader enters", () => {
    const writes: Record<string, unknown>[] = [];
    const source = {
      extra: {},
      setExtra: (key: string, value: unknown) => writes.push({ [key]: value }),
      setExtras: (patch: Record<string, unknown>) => writes.push(patch),
    } as unknown as Parameters<typeof FilterHeaderRow>[0]["source"];
    render(
      <table>
        <thead>
          <FilterHeaderRow
            columns={[{ key: "name" }, { key: "team" }, { key: "age" }]}
            defs={[
              { key: "name", label: "Name", type: "text" },
              {
                key: "team",
                label: "Team",
                type: "select",
                options: [
                  { value: "core", label: "Core" },
                  { value: "web", label: "Web" },
                ],
              },
              { key: "age", label: "Age", type: "numberRange" },
            ]}
            source={source}
            labels={defaultLabels}
          />
        </thead>
      </table>
    );
    fireEvent.change(screen.getByRole("searchbox", { name: /Name/ }), {
      target: { value: "ada" },
    });
    expect(writes).toContainEqual({ name: "ada", nameOp: "contains" });
    fireEvent.change(screen.getByRole("combobox", { name: /Team/ }), {
      target: { value: "web" },
    });
    expect(writes).toContainEqual({ team: ["web"] });
    const [from] = screen.getAllByRole("spinbutton");
    fireEvent.change(from!, { target: { value: "30" } });
    expect(JSON.stringify(writes.at(-1))).toContain("30");
  });
});
