import { render, screen } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { bulkActions, savedViews } from "../features/factories";
import { filters as coreFilters } from "../features/filters";
import { grouping as coreGrouping } from "../features/grouping";
import {
  FeatureProviders,
  FeatureSlot,
  slotRender,
} from "../features/providers";
import { COMMAND_PALETTE_LIVE, SIDE_PANEL } from "../features/slotKeys";
import {
  applyTableFeatures,
  type TableFeature,
} from "../features/tableFeature";
import { createAdapterAgentApprovalFeature } from "./agentApproval";
import { createAdapterCommandPaletteFeature } from "./commandPalette";
import { createAdapterContextMenuFeature } from "./contextMenu";
import { createAdapterEditingFeatures } from "./editing";
import { ContextMenuLiveGate, OptionalSidePanel } from "./featureRoot";
import { createAdapterFiltersFeature } from "./filters";
import { createAdapterGroupingFeature } from "./grouping";
import { createAdapterGroupingPanelFeature } from "./groupingPanel";
import { createAdapterRowDetailFeatures } from "./rowDetail";
import { createAdapterRowReorderFeature } from "./rowReorder";
import { createAdapterStandardFeatures } from "./standardPreset";

const KitComponent = () => null;

function renderSlots<TRow>(feature: TableFeature<TRow>): string[] {
  return feature.renders?.map((entry) => entry.slot.id) ?? [];
}

function expectKitRenders<TRow>(
  feature: TableFeature<TRow>,
  slotIds: readonly string[]
): void {
  for (const slotId of slotIds) {
    const entry = feature.renders?.find((next) => next.slot.id === slotId);
    expect(entry, `${slotId} renderer`).toBeDefined();
    expect(isValidElement(entry?.render({} as never))).toBe(true);
  }
}

function featureTree<TRow>(
  features: readonly TableFeature<TRow>[],
  children: ReactNode
): ReactNode {
  const props = applyTableFeatures({ features });
  return <FeatureProviders props={props}>{children}</FeatureProviders>;
}

describe("adapter feature assembly", () => {
  it("keeps core editing lifecycle and adds kit editing chrome", () => {
    const features = createAdapterEditingFeatures({
      EditableCell: KitComponent,
      RowEditActions: KitComponent,
      BatchEditBar: KitComponent,
      UndoRedoButtons: KitComponent,
    });
    const editing = features.editing<{ id: string }>(() => undefined);
    const rowEditing = features.rowEditing<{ id: string }>(() => undefined);
    const batch = features.batchEditing<{ id: string }>(() => undefined);

    expect(renderSlots(editing)).toEqual([
      "editing-live",
      "editable-cell",
      "row-edit-actions",
    ]);
    expect(renderSlots(batch)).toEqual([
      "editing-live",
      "editable-cell",
      "row-edit-actions",
      "batch-edit-bar",
    ]);
    expect(renderSlots(rowEditing)).toEqual(renderSlots(editing));
    expect(features.dirtyIndicators().id).toBe("dirty-indicators");
    expect(renderSlots(features.editHistory())).toEqual(["edit-history-live"]);
    expect(renderSlots(features.undoRedoButtons())).toEqual(["toolbar-extras"]);
    expectKitRenders(editing, ["editable-cell", "row-edit-actions"]);
    expectKitRenders(rowEditing, ["editable-cell", "row-edit-actions"]);
    expectKitRenders(batch, [
      "editable-cell",
      "row-edit-actions",
      "batch-edit-bar",
    ]);
    expectKitRenders(features.undoRedoButtons(), ["toolbar-extras"]);
    expectTypeOf(editing).toEqualTypeOf<TableFeature<{ id: string }>>();
  });

  it("supports the one established history-with-controls kit contract", () => {
    const features = createAdapterEditingFeatures({
      EditableCell: KitComponent,
      RowEditActions: KitComponent,
      BatchEditBar: KitComponent,
      UndoRedoButtons: KitComponent,
      historyIncludesControls: true,
    });

    expect(renderSlots(features.editHistory())).toEqual([
      "edit-history-live",
      "toolbar-extras",
    ]);
    expectKitRenders(features.editHistory(), ["toolbar-extras"]);
  });

  it("keeps filter state providers while adding all four kit surfaces", () => {
    const filters = createAdapterFiltersFeature({
      FiltersForm: KitComponent,
      ActiveFilterChips: KitComponent,
      FilterDrawer: KitComponent,
      FilterPopover: KitComponent,
    });
    const feature = filters<{ id: string }>([
      { key: "id", type: "text", label: "Id" },
    ]);

    expect(feature.provider).toBeDefined();
    expect(renderSlots(feature)).toEqual([
      "filter-chips-live",
      "filters-form",
      "active-filter-chips",
      "filter-drawer",
      "filter-popover",
    ]);
    expectKitRenders(feature, [
      "filters-form",
      "active-filter-chips",
      "filter-drawer",
      "filter-popover",
    ]);
    expectTypeOf(feature).toEqualTypeOf<TableFeature<{ id: string }>>();
  });

  it("binds grouping, expansion and reorder without replacing core state", () => {
    const grouping = createAdapterGroupingFeature({
      GroupHeaderRow: KitComponent,
      GroupHeaderCard: KitComponent,
    });
    const detail = createAdapterRowDetailFeatures({
      ExpandToggle: KitComponent,
    });
    const reorder = createAdapterRowReorderFeature({
      RowReorderHandle: KitComponent,
      RowReorderButtons: KitComponent,
    });

    const groupingFeature = grouping("team");
    expect(renderSlots(groupingFeature)).toEqual([
      "grouping-live",
      "group-header-row",
      "group-header-card",
    ]);
    expectKitRenders(groupingFeature, [
      "group-header-row",
      "group-header-card",
    ]);
    const rowDetailFeature = detail.rowDetail(() => null);
    expect(renderSlots(rowDetailFeature)).toEqual([
      "expansion-live",
      "expand-toggle",
    ]);
    expectKitRenders(rowDetailFeature, ["expand-toggle"]);
    const nestedFeature = detail.nestedTable(() => ({ table: () => null }));
    expect(renderSlots(nestedFeature)).toEqual([
      "expansion-live",
      "expand-toggle",
    ]);
    expectKitRenders(nestedFeature, ["expand-toggle"]);
    const reorderFeature = reorder<{ id: string }>(() => undefined);
    expect(reorderFeature.provider).toBeDefined();
    expect(renderSlots(reorderFeature)).toEqual([
      "row-reorder-handle",
      "row-reorder-buttons",
      "row-reorder-announcer",
    ]);
    expectKitRenders(reorderFeature, [
      "row-reorder-handle",
      "row-reorder-buttons",
      "row-reorder-announcer",
    ]);
  });

  it("binds the interactive grouping panel and group headers", () => {
    const groupingPanel = createAdapterGroupingPanelFeature({
      GroupHeaderRow: KitComponent,
      GroupHeaderCard: KitComponent,
      GroupingPanel: KitComponent,
    });
    const feature = groupingPanel("team");
    expect(feature.provider).toBeDefined();
    expect(renderSlots(feature)).toEqual([
      "grouping-live",
      "group-header-row",
      "group-header-card",
      "grouping-panel",
    ]);
    expectKitRenders(feature, [
      "group-header-row",
      "group-header-card",
      "grouping-panel",
    ]);
  });

  it("binds the kit approval strip to the agent-approval slot", () => {
    const feature = createAdapterAgentApprovalFeature(KitComponent);
    expect(feature.id).toBe("agent-approval");
    expect(renderSlots(feature)).toEqual(["agent-approval"]);
    expectKitRenders(feature, ["agent-approval"]);
  });

  it("owns live context-menu and command-palette hooks in core assembly", () => {
    const contextMenu = createAdapterContextMenuFeature(KitComponent);
    const commandPalette = createAdapterCommandPaletteFeature(KitComponent);
    const contextFeature = contextMenu();
    const commandFeature = commandPalette();

    expect(renderSlots(contextFeature)).toEqual([
      "column-layout-live",
      "context-menu-live",
    ]);
    expect(renderSlots(commandFeature)).toEqual(["command-palette-live"]);

    render(
      featureTree(
        [contextFeature, commandFeature],
        <>
          <ContextMenuLiveGate
            props={{
              contextMenu: true,
              columns: [],
              labels: {},
              rowFor: () => undefined,
              actions: {},
            }}
          >
            {(regionProps) => (
              <div data-testid="context-region">
                {String("onContextMenu" in regionProps)}
              </div>
            )}
          </ContextMenuLiveGate>
          <FeatureSlot
            slot={COMMAND_PALETTE_LIVE}
            props={{
              commandPalette: true,
              labels: {},
            }}
          />
        </>
      )
    );

    expect(screen.getByTestId("context-region")).toHaveTextContent("true");
  });

  it("keeps root gates transparent until their slots are composed", () => {
    const { rerender } = render(
      featureTree(
        [],
        <>
          <ContextMenuLiveGate props={{} as never}>
            {(regionProps) => (
              <span data-testid="plain-context">
                {String(Object.keys(regionProps).length)}
              </span>
            )}
          </ContextMenuLiveGate>
          <OptionalSidePanel
            side="start"
            body={<span>plain body</span>}
            panel={<span>hidden panel</span>}
          />
        </>
      )
    );

    expect(screen.getByTestId("plain-context")).toHaveTextContent("0");
    expect(screen.getByText("plain body").parentElement).not.toHaveAttribute(
      "data-adapttable-part"
    );
    expect(screen.queryByText("hidden panel")).not.toBeInTheDocument();

    const sidePanelFeature: TableFeature = {
      id: "side-panel-test",
      renders: [slotRender(SIDE_PANEL, () => null)],
    };
    rerender(
      featureTree(
        [sidePanelFeature],
        <OptionalSidePanel
          side="start"
          body={<span>table body</span>}
          panel={<span>visible panel</span>}
        />
      )
    );

    const region = screen.getByText("table body").parentElement?.parentElement;
    expect(region).toHaveAttribute("data-adapttable-part", "table-region");
    expect(region).toHaveStyle({ flexDirection: "row-reverse" });
    expect(screen.getByText("visible panel")).toBeInTheDocument();

    rerender(
      featureTree(
        [sidePanelFeature],
        <OptionalSidePanel body={<span>body only</span>} panel={false} />
      )
    );
    expect(screen.queryByText("visible panel")).not.toBeInTheDocument();
    expect(screen.getByText("body only")).toBeInTheDocument();
  });

  it("builds the standard preset in canonical order and adds only options", () => {
    const standardFeatures = createAdapterStandardFeatures({
      columnMenu: () => ({ id: "column-menu" }),
      densityChooser: () => ({ id: "density" }),
      exportCsv: () => ({ id: "export-csv" }),
      findInTable: () => ({ id: "find-in-table" }),
      fitColumns: () => ({ id: "fit-columns" }),
      fullscreen: () => ({ id: "fullscreen" }),
      headerFilters: () => ({ id: "header-filters" }),
      multiSort: () => ({ id: "multi-sort" }),
      resizableColumns: () => ({ id: "resizable-columns" }),
      statusBar: () => ({ id: "status-bar" }),
      grouping: coreGrouping,
      bulkActions,
      filters: coreFilters,
      savedViews,
    });

    expect(standardFeatures().map((feature) => feature.id)).toEqual([
      "column-menu",
      "density",
      "export-csv",
      "find-in-table",
      "fit-columns",
      "fullscreen",
      "header-filters",
      "multi-sort",
      "resizable-columns",
      "status-bar",
    ]);
    expect(
      standardFeatures<{ id: string }>({
        grouping: "team",
        filters: [{ key: "id", type: "text", label: "Id" }],
        bulkActions: [],
        savedViews: { storageKey: "views" },
      }).map((feature) => feature.id)
    ).toEqual([
      "column-menu",
      "density",
      "export-csv",
      "find-in-table",
      "fit-columns",
      "fullscreen",
      "header-filters",
      "multi-sort",
      "resizable-columns",
      "status-bar",
      "grouping",
      "bulk-actions",
      "filters",
      "saved-views",
    ]);
  });
});
