import type { DataTableClassNames } from "@adapttable/vue/adapter";

import { cn } from "./lib/utils";

/** New York presentation tokens on the binding's canonical semantic parts. */
export const shadcnClassNames: DataTableClassNames = {
  root: "adapttable-shadcn-vue min-w-0 space-y-4 text-foreground text-sm",
  toolbar: "flex flex-wrap items-center gap-3",
  searchWrapper: "relative min-w-40 flex-1 sm:max-w-sm",
  searchInput: "ps-9",
  searchIcon:
    "pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
  scroll: "min-w-0 overflow-auto rounded-xl border border-border",
  table: "w-full caption-bottom border-collapse text-sm",
  thead: "[&_tr]:border-b",
  tbody: "[&_tr:last-child]:border-0",
  tr: "border-b border-border bg-background transition-colors hover:bg-[color-mix(in_oklab,var(--muted,#f4f4f5)_50%,var(--background,#ffffff))] aria-selected:bg-muted",
  th: "h-11 whitespace-nowrap bg-background px-3 text-start align-middle font-medium text-muted-foreground",
  td: "bg-inherit p-3 align-middle",
  sortButton:
    "h-auto min-h-9 justify-start border-0 p-0 shadow-none hover:bg-transparent",
  sortIndex: "text-xs tabular-nums text-muted-foreground",
  selectionHeader: "w-12 bg-background px-3 text-start align-middle",
  selectionCell: "w-12 bg-inherit px-3 align-middle",
  selectionCheckbox: "align-middle",
  columnGroup: "h-11 border-b border-border px-3 text-start font-medium",
  cards: "grid min-w-0 gap-3 sm:grid-cols-2",
  card: "min-w-0 gap-3 border-border p-4",
  cardFields: "m-0 grid gap-3",
  cardRow:
    "grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-baseline gap-3",
  cardLabel: "text-muted-foreground",
  cardValue: "m-0 min-w-0 break-words text-end font-medium",
  cardActions: "flex flex-wrap items-center gap-2 border-t border-border pt-3",
  footer:
    "flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground",
  pager: "flex flex-wrap items-center gap-2",
  pageNumber:
    "aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground dark:aria-[current=page]:bg-primary",
  loadingCards: "grid gap-3 sm:grid-cols-2",
  loadingCard: "gap-4 border-border p-4",
  loadingTable: "w-full border-collapse",
  loadingHeaderCell: "p-3",
  loadingCell: "p-3",
  loadingLine: "h-4 w-3/4",
  empty:
    "block rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground",
  emptyClear: "ms-3",
  error:
    "rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive",
  retry: "mt-2",
  refreshing: "text-sm text-muted-foreground",
  summaryRow: "border-t border-border bg-muted/50 font-medium",
  summaryCell: "p-3",
  summaryCard: "rounded-xl border border-border bg-muted/50 p-4",
  tableFooter: "text-sm text-muted-foreground",
  groupRow: "bg-muted/40",
  groupCell: "p-3",
  groupCard: "rounded-xl border border-border p-3",
  groupLabel: "font-medium",
  groupCount: "ms-2 text-xs text-muted-foreground",
  groupAggregate: "ms-3 text-sm tabular-nums",
  groupToggle: "align-middle",
  groupCheckbox: "mx-2 align-middle",
  groupMore: "text-muted-foreground",
  groupFooterCell: "border-t border-border p-3 font-medium",
  groupMoreCell: "px-3 py-2",
  editableCell: "inline-flex min-w-0 flex-col gap-1",
  editCellActivate:
    "min-w-0 max-w-full justify-start whitespace-normal px-2 text-start",
  editCellEditor: "min-w-20",
  editCellError: "text-xs text-destructive",
  editCellSaveError: "text-xs text-destructive",
  rowEditActions: "inline-flex flex-wrap gap-2",
  batchEditBar:
    "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3",
  editHistory: "inline-flex gap-2",
};

/** Preserve every caller hook while allowing Tailwind utilities to override defaults. */
export function resolveShadcnClassNames(
  input: DataTableClassNames = {}
): DataTableClassNames {
  return Object.fromEntries(
    [...new Set([...Object.keys(shadcnClassNames), ...Object.keys(input)])].map(
      (key) => {
        const name = key as keyof DataTableClassNames;
        return [name, cn(shadcnClassNames[name], input[name])];
      }
    )
  );
}
