import { resolveLabels } from "@adapttable/core";
import type { GroupingPanelState } from "@adapttable/react/adapter";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GroupingPanel } from "./components/GroupingPanel";
import { renderMantine } from "./test-utils";

const columns = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget" },
];

function panelState(
  overrides: Partial<GroupingPanelState> = {}
): GroupingPanelState {
  return {
    groupBy: ["team"],
    aggregateOverrides: {},
    canSetAggregates: true,
    announcement: "",
    headerDragProps: () => ({}),
    chipDragProps: () => ({ draggable: true }),
    chipKeyboardProps: (_key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Move ${label}`,
      onKeyDown: vi.fn(),
    }),
    dropProps: () => ({}),
    removeDropProps: () => ({}),
    add: vi.fn(),
    remove: vi.fn(),
    moveBy: vi.fn(),
    setAggregate: vi.fn(),
    ...overrides,
  };
}

describe("Mantine GroupingPanel", () => {
  it("uses accessible touch-sized controls to add and remove fields", () => {
    const state = panelState();
    renderMantine(
      <GroupingPanel
        state={state}
        columns={columns}
        labels={resolveLabels(undefined)}
        mobile={false}
      />
    );

    const handle = screen.getByRole("button", { name: "Move Team" });
    const remove = screen.getByRole("button", {
      name: "Remove Team from grouping",
    });
    expect(handle.style.height).toContain("2.75rem");
    expect(handle.style.width).toContain("2.75rem");
    expect(remove.style.height).toContain("2.75rem");
    expect(remove.style.width).toContain("2.75rem");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.click(remove);
    expect(state.remove).toHaveBeenCalledWith("team");

    fireEvent.click(
      screen.getByRole("combobox", { name: "Add grouping column" })
    );
    fireEvent.click(screen.getByRole("option", { name: "Budget" }));
    expect(state.add).toHaveBeenCalledWith("budget");
  });

  it("shows active insertion and drop-to-remove states", () => {
    const state = panelState({
      groupBy: ["team", "budget"],
      drag: {
        key: "budget",
        source: "chip",
        overIndex: 0,
        overRemove: true,
      },
      dropProps: () => ({ "data-drop-active": true }),
      removeDropProps: () => ({ "data-drop-active": true }),
    });
    renderMantine(
      <GroupingPanel
        state={state}
        columns={columns}
        labels={resolveLabels(undefined)}
        mobile={false}
      />
    );

    expect(
      document.querySelector(
        '[data-adapttable-part="grouping-drop-zone"][data-drop-active="true"]'
      )
    ).not.toBeNull();
    expect(
      screen.getByRole("region", { name: "Drop here to remove grouping" })
    ).toHaveAttribute("data-drop-active", "true");
  });
});
