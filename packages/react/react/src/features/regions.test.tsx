import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./providers", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("./providers");
  return {
    ...actual,
    FeatureSlot: ({ props }: { readonly props: { onClose?: () => void } }) => {
      props.onClose?.();
      return null;
    },
  };
});

import { AGENT_APPROVAL_STATE } from "../editing/AgentApprovalChrome";
import {
  COMMAND_PALETTE_RENDER,
  FILTER_DRAWER_RENDER,
  FIND_BAR_RENDER,
  GRID_FOCUS_ANNOUNCER_RENDER,
  GROUPING_PANEL_RENDER,
  ROW_REORDER_ANNOUNCER_RENDER,
  SIDE_PANEL_RENDER,
  STATUS_BAR_RENDER,
} from "./areaRegions";
import {
  AGENT_APPROVAL_BAR_RENDER,
  BATCH_EDIT_BAR_RENDER,
  BULK_ACTIONS_BAR_RENDER,
  FILTER_CHIPS_BAR_RENDER,
} from "./barRegions";
import { FeatureStateScope } from "./featureState";
import { EDITING_STATE, EXPORT_STATE, FILTER_CHIPS_STATE } from "./stateKeys";

function region(
  props: Record<string, unknown> = {},
  view: Record<string, unknown> = {}
): never {
  return {
    view: {
      chrome: {
        clearFilters: vi.fn(),
        confirm: vi.fn(),
        allColumns: [],
        isMobile: false,
        featureNotices: [],
        table: { labels: {} },
      },
      labels: {},
      table: { selection: { selectedCount: 2 } },
      source: { total: 4, rows: [{ id: "a" }], page: 1, limit: 25 },
      gridFocus: { row: 0 },
      find: { query: "" },
      featureHost: {},
      tableProps: {},
      filtersNode: "filters",
      filtersOpen: true,
      setFiltersOpen: vi.fn(),
      selectionStats: { count: 1 },
      ...view,
    },
    props: { dir: "ltr", locale: "en", ...props },
  } as never;
}

function draw(node: ReactNode) {
  render(node);
}

function withState(
  key: { readonly id: string },
  value: unknown,
  node: ReactNode
) {
  return (
    <FeatureStateScope stateKey={key} value={value as never}>
      {node}
    </FeatureStateScope>
  );
}

describe("composed table regions", () => {
  it("draws each bar from the feature that owns it, and nothing when that feature is idle", () => {
    draw(FILTER_CHIPS_BAR_RENDER.render(region()));
    draw(BATCH_EDIT_BAR_RENDER.render(region()));
    draw(
      withState(
        EDITING_STATE,
        { batch: { rows: [] }, conflict: { anyContested: true } },
        BATCH_EDIT_BAR_RENDER.render(region())
      )
    );
    draw(
      withState(
        AGENT_APPROVAL_STATE,
        [],
        AGENT_APPROVAL_BAR_RENDER.render(region())
      )
    );
    draw(
      BULK_ACTIONS_BAR_RENDER.render(
        region({}, { table: { selection: undefined } })
      )
    );
    draw(
      BULK_ACTIONS_BAR_RENDER.render(
        region({
          bulkActions: [{ key: "del", label: "Delete", onClick: vi.fn() }],
        })
      )
    );
    expect(FILTER_CHIPS_BAR_RENDER.slot.id).toBe("table-bars");
  });

  it("draws each area, including the branches a missing feature skips", () => {
    const close = vi.fn();
    const setFiltersOpen = vi.fn();
    draw(GRID_FOCUS_ANNOUNCER_RENDER.render(region()));
    draw(ROW_REORDER_ANNOUNCER_RENDER.render(region()));
    draw(
      ROW_REORDER_ANNOUNCER_RENDER.render(
        region({}, { tableProps: { rowReorder: { announcement: "moved" } } })
      )
    );
    draw(FIND_BAR_RENDER.render(region()));
    draw(
      withState(
        FILTER_CHIPS_STATE,
        { activeFilterCount: 1, chips: [] },
        withState(
          EXPORT_STATE,
          { onExportCsv: vi.fn(), exportLabel: "CSV" },
          COMMAND_PALETTE_RENDER.render(region())
        )
      )
    );
    draw(GROUPING_PANEL_RENDER.render(region()));
    draw(
      GROUPING_PANEL_RENDER.render(
        region({}, { tableProps: { groupingPanel: { columns: [] } } })
      )
    );
    draw(SIDE_PANEL_RENDER.render(region()));
    const side = {
      panels: [{ key: "columns", label: "Columns" }],
      open: "columns",
      onOpenChange: close,
      side: "end",
    };
    draw(SIDE_PANEL_RENDER.render(region({ sidePanel: side })));
    draw(FILTER_DRAWER_RENDER.render(region({ filtersMode: "popover" })));
    draw(
      withState(
        FILTER_CHIPS_STATE,
        { activeFilterCount: 2, chips: [] },
        FILTER_DRAWER_RENDER.render(
          region({ filtersMode: "drawer" }, { setFiltersOpen })
        )
      )
    );
    draw(STATUS_BAR_RENDER.render(region({ statusBar: true })));
    draw(STATUS_BAR_RENDER.render(region({}, { table: {} })));
    expect(close).toHaveBeenCalledWith(null);
    expect(setFiltersOpen).toHaveBeenCalledWith(false);
  });
});
