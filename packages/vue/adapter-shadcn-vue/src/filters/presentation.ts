import type { DataTableClassNames } from "@adapttable/vue/adapter";

import { cn } from "../lib/utils";

/** Filter paint only; all structure and field state stay in binding Chrome. */
const defaults: DataTableClassNames = {
  filtersAnchor: "relative inline-flex",
  filtersForm: "grid min-w-0 gap-4",
  filtersHeader: "mb-4 flex items-center justify-between gap-3",
  filtersTitle: "m-0 text-base font-semibold",
  filtersBody: "grid min-w-0 gap-4",
  filtersFooter:
    "mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4",
  chips: "m-0 flex list-none flex-wrap items-center gap-2 p-0",
  chip: "flex min-w-0 items-center gap-1 rounded-md bg-secondary ps-2 text-sm",

  filterField: "grid min-w-0 gap-2",
  filterLabel: "text-sm font-medium",
  filterControl: "min-w-0",
  filterInput: "min-h-11 sm:min-h-9",
  filterSelect: "min-h-11 sm:min-h-9",
  filterOperator: "min-h-11 sm:min-h-9",
  filterCheckboxGroup: "grid gap-1",
  filterOptionsLoading: "text-sm text-muted-foreground",
  filterChecklist: "grid min-w-0 gap-3",
  filterChecklistSearch: "min-h-11 sm:min-h-9",
  filterChecklistActions: "flex flex-wrap gap-2",
  filterChecklistList: "grid gap-1 overflow-auto",
  filterChecklistCount: "ms-auto text-xs tabular-nums text-muted-foreground",
  filterTree: "grid min-w-0 gap-3",
  filterTreeSummary: "w-full justify-start min-h-11 sm:min-h-9",
  filterTreeGroup: "grid min-w-0 gap-3 rounded-md border border-border p-3",
  filterTreeCondition: "flex min-w-0 flex-wrap items-end gap-2",
  filterTreeActions: "flex flex-wrap gap-2",
  filterTreeRemove: "min-h-11 sm:min-h-9",
  filterHeaderRow: "border-b border-border",
  filterHeaderCell: "p-2 text-start align-top",
  filterHeaderInput: "min-h-11 sm:min-h-9",
  filterHeaderMenu: "grid max-h-80 gap-1 overflow-auto",
};

export function filterClassNames(
  input: DataTableClassNames = {}
): DataTableClassNames {
  return Object.fromEntries(
    [...new Set([...Object.keys(defaults), ...Object.keys(input)])].map(
      (key) => {
        const name = key as keyof DataTableClassNames;
        return [name, cn(defaults[name], input[name])];
      }
    )
  );
}
