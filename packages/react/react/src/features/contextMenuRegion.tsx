/**
 * The context menu's root region: builds the menu's inputs from the finished
 * view and wraps the table's root with whatever fills the menu slot.
 */
import type { ReactNode } from "react";

import { ContextMenuLiveGate } from "../adapterFeatures/featureRoot";
import { contextMenuCopyTarget } from "../focus/contextMenuCopy";
import { type RootRegionProps, TABLE_ROOT_REGION } from "../kit/rootRegion";
import type { RowPinningState } from "../rows/rowPinning";
import type { DataTableShellResult } from "../useDataTableShell";
import { useFeatureState } from "./featureState";
import { slotRender } from "./providers";
import type { ContextMenuLiveSlotProps } from "./slotKeys";
import { ROW_PINNING_STATE } from "./stateKeys";

/** The menu's inputs, from the finished view and the table's props. */
function contextMenuOptions<TRow>(
  view: DataTableShellResult<TRow>,
  props: RootRegionProps<TRow>["props"],
  rowPinning: RowPinningState<unknown> | undefined
): Omit<ContextMenuLiveSlotProps<unknown>, "children"> {
  const { chrome, gridFocus, source } = view;
  const copy = (
    target: Parameters<typeof contextMenuCopyTarget>[1],
    cut?: true
  ) => {
    // The cell that was right-clicked, unless it sits inside a selection —
    // then the selection is what was asked for.
    const found = contextMenuCopyTarget(gridFocus, target);
    if (found.available) gridFocus.copyCells(found.cell, cut);
  };
  return {
    contextMenu: props.contextMenu,
    columns: chrome.allColumns,
    labels: view.labels,
    rowFor: (rowId: string) =>
      source.rows.find((row) => props.rowKey(row) === rowId),
    actions: {
      onCopy: (target) => {
        copy(target);
      },
      // Cut writes the target to the clipboard, then asks the host to clear
      // it through onCellCut — offered only when both exist.
      onCut:
        props.onCellCut && gridFocus.enabled
          ? (target) => {
              copy(target, true);
            }
          : undefined,
      onSort: (key: string, dir: "asc" | "desc") => {
        source.setSort(key, dir);
      },
      onHide: (key: string) => {
        chrome.columnLayout.toggleVisible(key);
      },
      onFilter: () => {
        view.setFiltersOpen(true);
      },
    },
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    rowPins: rowPinning?.actions,
    featureHost: view.featureHost,
    container: view.fullscreen.container,
  } as Omit<ContextMenuLiveSlotProps<unknown>, "children">;
}

/** Wrap the table's root with the menu: its handlers land on the root. */
function ContextMenuRegion<TRow>({
  view,
  props,
  children,
}: Readonly<RootRegionProps<TRow>>): ReactNode {
  "use no memo";
  const rowPinning = useFeatureState(ROW_PINNING_STATE);
  return (
    <ContextMenuLiveGate props={contextMenuOptions(view, props, rowPinning)}>
      {children}
    </ContextMenuLiveGate>
  );
}

/** The region render the context-menu feature brings. */
export const CONTEXT_MENU_REGION_RENDER = slotRender(
  TABLE_ROOT_REGION,
  (props) => <ContextMenuRegion {...props} />
);
