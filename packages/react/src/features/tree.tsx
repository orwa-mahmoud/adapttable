/**
 * Tree rows — `@adapttable/<kit>/tree`.
 *
 * Expansion, lazy children and the walked hierarchy live on this entry.
 * The hooks mount in-tree through {@link TREE_LIVE}.
 */
import { buildTreeEntries, treeColumnKey } from "@adapttable/core";
import { type ReactNode, useMemo } from "react";

import { useLazyChildren } from "../tree/useLazyChildren";
import { useTreeExpansion } from "../tree/useTreeExpansion";
import { hasLoadedChildren } from "../virtual/chromeBodyShared";
import { slotRender } from "./providers";
import { type ChromeExtraSlotProps, TREE_LIVE } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

function LiveTree({
  chrome,
  props,
  children,
}: ChromeExtraSlotProps<never>): ReactNode {
  const getRowId = chrome.getRowId;
  const treeExpansion = useTreeExpansion({
    expandedIds: props.expandedIds,
    onExpandedIdsChange: props.onExpandedIdsChange,
  });
  const treeShaped =
    props.getChildren !== undefined || props.getParentId !== undefined;
  const lazyChildren = useLazyChildren({
    onLoadChildren: props.onLoadChildren,
    hasLoadedChildren: (row) =>
      hasLoadedChildren(row, chrome.source.rows, props),
    getRowId,
  });
  const treeEntries = useMemo(
    () =>
      treeShaped
        ? buildTreeEntries({
            rows: chrome.source.rows,
            getRowId,
            expandedIds: treeExpansion.expandedIds,
            loadingIds: lazyChildren.loadingIds,
            getChildren: props.getChildren,
            getParentId: props.getParentId,
            hasChildren: props.hasChildren,
          })
        : undefined,
    [
      treeShaped,
      chrome.source.rows,
      getRowId,
      treeExpansion.expandedIds,
      lazyChildren.loadingIds,
      props.getChildren,
      props.getParentId,
      props.hasChildren,
    ]
  );
  const treeExportEntries = useMemo(
    () =>
      treeEntries
        ? buildTreeEntries({
            rows: chrome.source.rows,
            getRowId,
            expandedIds: new Set(
              treeEntries.flatMap((entry) => [
                entry.key,
                ...entry.descendantIds,
              ])
            ),
            getChildren: props.getChildren,
            getParentId: props.getParentId,
            hasChildren: props.hasChildren,
          })
        : undefined,
    [
      treeEntries,
      chrome.source.rows,
      getRowId,
      props.getChildren,
      props.getParentId,
      props.hasChildren,
    ]
  );
  const tree = useMemo(() => {
    if (!treeEntries) return undefined;
    return {
      entries: treeEntries,
      allEntries: treeExportEntries,
      expansion: {
        ...treeExpansion,
        toggle: (id: string) => {
          const entry = treeEntries.find((candidate) => candidate.key === id);
          if (entry && !entry.expanded) lazyChildren.loadIfNeeded(entry.row);
          treeExpansion.toggle(id);
        },
      },
      loadingIds: lazyChildren.loadingIds,
      failedIds: lazyChildren.failedIds,
      columnKey: treeColumnKey(
        chrome.columnLayout.visibleColumns,
        props.treeColumn
      ),
    };
  }, [
    treeEntries,
    treeExportEntries,
    treeExpansion,
    lazyChildren,
    props.treeColumn,
    chrome.columnLayout.visibleColumns,
  ]);

  return children({ ...chrome, tree });
}

/**
 * Render rows as an expandable tree.
 *
 * @public
 */
export function tree<TRow>(
  options: {
    getChildren?: (row: TRow) => readonly TRow[] | undefined;
    getParentId?: (row: TRow) => string | undefined;
    hasChildren?: (row: TRow) => boolean;
    treeColumn?: string;
    onLoadChildren?: (row: TRow) => void | Promise<void>;
    expandedIds?: readonly string[];
    onExpandedIdsChange?: (ids: string[]) => void;
  } = {}
): TableFeature<TRow> {
  return {
    id: "tree",
    apply: () => options,
    renders: [slotRender(TREE_LIVE, (props) => <LiveTree {...props} />)],
  };
}
