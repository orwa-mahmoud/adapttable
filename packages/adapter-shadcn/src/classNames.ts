import type { DataTableClassNames } from "@adapttable/unstyled";

/**
 * shadcn/ui class preset for AdaptTable. Maps every AdaptTable part to shadcn's
 * design-token utility classes (`bg-card`, `text-muted-foreground`,
 * `border-border`, `bg-primary`, `ring-ring`, …) — deliberately **monochrome
 * with ring focus**, the shadcn signature.
 *
 * It only *references* shadcn's tokens, so your app must have shadcn/ui set up
 * (its CSS variables + Tailwind config). Pass this to a `@adapttable/unstyled`
 * `<DataTable classNames={shadcnClassNames} />`, or just import the pre-wired
 * `DataTable` from `@adapttable/shadcn`. Override any part by merging your own
 * classes over it.
 *
 * @public
 */
export const shadcnClassNames = {
  root: "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
  toolbar: "flex flex-wrap items-center gap-2 p-3 border-b border-border",
  searchField:
    "flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
  searchIcon: "text-muted-foreground",
  search:
    "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
  sortSelect: "h-9 rounded-md border border-input bg-background px-2 text-sm",
  rowsPerPage:
    "h-8 rounded-md border border-input bg-background px-1.5 text-sm text-foreground",
  filtersButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
  // The one toolbar control that changes the data rather than the view, so it
  // takes shadcn's primary button rather than the outline every other one uses.
  addRow:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90",
  exportCsvButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
  // Undo and Redo are the toolbar's quietest pair: they sit disabled most of
  // the time, so they take the outline treatment and the muted disabled state
  // rather than a filled one that would keep drawing the eye.
  undoButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none",
  redoButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none",
  // Print sits with the view controls and is never disabled, so it takes the
  // outline treatment without the muted state the undo pair needs.
  printButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
  densityToggle:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
  fullscreenToggle:
    "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground",
  commandPalette:
    "rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg",
  commandInput:
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
  commandItem:
    "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[active]:bg-accent data-[active]:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none",
  commandEmpty: "px-2 py-3 text-sm text-muted-foreground",
  contextMenu:
    "min-w-[10rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
  contextMenuItem:
    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none data-[danger]:text-destructive",
  contextMenuSeparator: "-mx-1 my-1 h-px bg-border",
  sidePanel:
    "w-[280px] shrink-0 rounded-lg border border-border bg-card p-3 text-card-foreground",
  sidePanelTab:
    "inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground data-[active]:bg-accent data-[active]:text-accent-foreground",
  sidePanelClose:
    "ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  statusBar:
    "flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-2 text-xs text-muted-foreground tabular-nums",
  statusItem: "whitespace-nowrap",
  cellSelected: "bg-accent",
  // Find hits keep the browser's convention rather than a theme token: amber
  // for every match, a stronger amber for the one you are on.
  cellMatch: "bg-amber-200/60 dark:bg-amber-400/25",
  cellMatchCurrent: "bg-amber-400/80 dark:bg-amber-400/60",
  exportSpinner:
    "size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
  filtersBackdrop: "fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]",
  filtersPanel:
    "fixed inset-y-0 end-0 z-50 flex w-[420px] max-w-[88vw] flex-col border-s border-border bg-card text-card-foreground shadow-2xl",
  filtersPopover:
    "z-50 mt-2 w-80 max-w-[88vw] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl",
  filtersCount:
    "inline-grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold leading-none text-primary-foreground",
  filtersHeader:
    "flex items-center justify-between border-b border-border px-4 py-3",
  filtersTitle: "text-base font-semibold",
  filtersClose:
    "flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-muted-foreground hover:bg-accent",
  filtersBody: "flex flex-1 flex-col gap-6 overflow-auto p-4",
  filtersForm: "flex flex-col gap-6",
  filterTree: "flex flex-col gap-3",
  filterTreeGroup: "m-0 flex flex-col gap-2 border-0 p-0",
  filterTreeCondition: "flex flex-wrap items-end gap-2",
  filterTreeActions: "flex flex-wrap gap-2",
  filterTreeRemove:
    "h-8 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent",
  filterTreeSummary:
    "flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-semibold",
  // ── Auto-built filter form (declarative `filters` definitions) ──
  filterField: "m-0 flex min-w-0 flex-col gap-4 border-0 p-0",
  filterLabel: "p-0 text-xs font-medium text-muted-foreground",
  filterInput:
    "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  filterSelect:
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  filterChecklist: "m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0",
  filterChecklistSearch:
    "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  filterChecklistActions: "flex flex-wrap gap-2",
  filterChecklistList:
    "flex max-h-60 flex-wrap items-center gap-2 overflow-auto",
  filterChecklistCount: "text-xs text-muted-foreground",
  filterCheckboxGroup: "flex flex-wrap items-center gap-2.5",
  filterCheckbox:
    "inline-flex cursor-pointer select-none items-center rounded-full border border-input bg-background px-3 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground [&>input]:sr-only",
  filtersFooter:
    "flex items-center justify-between gap-2 border-t border-border p-4",
  filtersClear:
    "h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50",
  filtersDone:
    "h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90",
  table: "w-full border-collapse text-sm",
  headerCell:
    "border-b border-border bg-card px-3 py-2.5 text-start font-medium text-muted-foreground [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  // Small, quiet, and sitting inside a header caption — it takes the muted
  // foreground and no box of its own.
  columnSelect:
    "ms-1 inline-flex items-center align-middle text-muted-foreground",
  sortButton:
    "inline-flex items-center gap-1 font-medium hover:text-foreground",
  row: "border-b border-border last:border-0 hover:bg-muted/50 data-[selected]:bg-accent data-[dragging]:opacity-60 data-[drop=before]:shadow-[inset_0_2px_0_0_hsl(var(--primary))] data-[drop=after]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))]",
  // Pinned cells must be opaque so scrolled content never shows through.
  cell: "px-3 py-2.5 [&[data-pinned]]:bg-card [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  cellSpan: "bg-muted/40 text-center",
  actionButton:
    "h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50",
  rowActionsTrigger:
    "inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden",
  rowActionsMenu:
    "relative inline-block [&>button]:block [&>button]:w-full [&>button]:px-2 [&>button]:text-start",
  footer:
    "flex flex-wrap items-center gap-2 border-t border-border p-3 text-sm text-muted-foreground",
  pager: "ms-auto flex flex-wrap items-center gap-1",
  pagePrev:
    "inline-grid h-8 min-w-8 place-items-center rounded-md border border-input bg-background px-2 text-sm text-foreground hover:bg-accent disabled:opacity-40 aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground",
  pageNext:
    "inline-grid h-8 min-w-8 place-items-center rounded-md border border-input bg-background px-2 text-sm text-foreground hover:bg-accent disabled:opacity-40 aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground",
  pageNumber:
    "inline-grid h-8 min-w-8 place-items-center rounded-md border border-input bg-background px-2 text-sm text-foreground hover:bg-accent disabled:opacity-40 aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground",
  pageEllipsis: "grid h-8 place-items-center px-1 text-muted-foreground",
  chips: "flex flex-wrap gap-2 px-3 pb-2",
  chip: "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground",
  chipRemove:
    "rounded px-1 text-muted-foreground transition-colors hover:text-foreground",
  empty:
    "flex flex-wrap items-center justify-center gap-3 px-4 py-10 text-sm text-muted-foreground",
  emptyClear:
    "rounded-md border border-input px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted",
  // ── Column popover ──────────────────────────────────────────────
  columnMenu: "relative",
  columnMenuSeparator: "my-1.5 border-border",
  columnMenuButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent data-[active]:bg-accent",
  columnMenuPanel:
    "z-50 min-w-[264px] rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-xl",
  columnMenuHeader: "px-1.5 pb-1.5 pt-1",
  columnMenuTitle:
    "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
  columnMenuItem:
    "flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/60",
  columnMenuGrip:
    "inline-flex cursor-grab text-muted-foreground/50 hover:text-foreground",
  columnMenuLabel:
    "flex-1 truncate text-[13px] font-medium data-[hidden]:text-muted-foreground data-[hidden]:line-through",
  columnMenuVisibility:
    "inline-grid place-items-center rounded p-[3px] text-muted-foreground hover:bg-muted hover:text-foreground",
  columnMenuPin:
    "inline-grid place-items-center rounded p-[3px] text-muted-foreground hover:bg-muted data-[active]:text-primary",
  columnMenuReset:
    "mt-1.5 w-full border-t border-border px-2 pb-1 pt-2 text-start text-[13px] font-medium text-primary hover:opacity-80",
  columnMenuAutoSize:
    "mt-1.5 w-full border-t border-border px-2 pb-1 pt-2 text-start text-[13px] font-medium text-primary hover:opacity-80",
  columnMenuSearch:
    "mb-1.5 h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  columnMenuBulk: "mb-1.5 flex flex-wrap gap-1 px-1",
  columnMenuBulkButton:
    "rounded-md px-2 py-1 text-start text-[12px] font-medium text-foreground hover:bg-muted/60",
  columnMenuMore:
    "inline-grid place-items-center rounded p-[3px] text-muted-foreground hover:bg-muted hover:text-foreground",
  columnMenuSubmenu: "ms-6 flex flex-col gap-0.5 py-1",
  columnMenuAction:
    "w-full rounded-md px-2 py-1.5 text-start text-[13px] font-medium hover:bg-muted/60 disabled:opacity-50",
  headerActions: "ms-1 inline-flex items-center gap-0.5",
  tableFooter: "px-3 py-2 text-sm text-muted-foreground",
  resizeHandle: "hover:bg-border",
  card: "list-none rounded-xl border border-border bg-card p-3 shadow-sm [[data-density=compact]_&]:p-2",
  cardRow:
    "flex items-start justify-between gap-3 py-1 text-sm first-of-type:mb-1 first-of-type:border-b first-of-type:border-border first-of-type:pb-2",
  cardLabel:
    "pt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
  cardValue: "min-w-0 text-right font-medium",
  // ── Structure & scroll ──────────────────────────────────────────
  thead: "bg-card",
  headerRow: "align-middle",
  filterHeaderRow: "align-middle",
  filterHeaderTrigger:
    "ms-1 inline-flex items-center text-muted-foreground hover:text-foreground",
  filterHeaderCell:
    "border-b border-border bg-card px-1 py-1 text-start [[data-density=compact]_&]:px-1 [[data-density=compact]_&]:py-0.5",
  filterHeaderInput:
    "h-7 w-full min-w-0 rounded-md border border-input bg-background px-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring",
  // The dropdown panel itself, matching every other part named `*Menu`/`*Panel`
  // — not the wrapper it is positioned against.
  filterHeaderMenu:
    "z-50 min-w-full rounded-md border border-border bg-card p-2 text-card-foreground shadow-xl",
  tbody: "align-middle",
  scrollBox: "overscroll-x-contain",
  virtualSpacer: "block",
  separatorRow: "border-b border-border",
  separatorCell: "px-3 py-1",
  fullWidthRow: "border-b border-border bg-muted/30",
  fullWidthCell:
    "px-3 py-2.5 text-sm [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  cards: "m-0 grid list-none gap-2 p-3",
  cardActions: "mt-2 flex justify-end gap-1 border-t border-border pt-2",
  // ── Header groups (column banding) ──────────────────────────────
  headerGroupRow: "border-b border-border",
  headerGroupCell:
    "border-b border-border bg-card px-3 py-1.5 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground",
  columnGroupToggle: "align-middle text-muted-foreground",
  sortIndex:
    "ms-1 inline-grid h-4 min-w-4 place-items-center rounded-full bg-primary/15 px-0.5 text-[10px] font-bold text-primary",
  // ── Filters chrome extras ───────────────────────────────────────
  filtersAnchor: "relative",
  filtersIcon: "text-muted-foreground",
  filterOperator:
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  filterOptionsLoading: "text-xs text-muted-foreground",
  // ── Saved views ─────────────────────────────────────────────────
  viewsMenu: "relative",
  viewsButton:
    "shrink-0 whitespace-nowrap inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
  viewsPanel:
    "z-50 min-w-[240px] rounded-xl border border-border bg-card p-1.5 text-card-foreground shadow-xl",
  viewsRow: "px-1 py-0.5",
  viewsItem:
    "flex-1 truncate rounded-md px-2 py-1.5 text-start text-[13px] font-medium hover:bg-muted/60",
  viewsDelete:
    "inline-grid place-items-center rounded p-[3px] text-muted-foreground hover:bg-muted hover:text-foreground",
  viewsSaveRow: "px-1 py-0.5",
  // `flex-1 min-w-0` lets the input give up its intrinsic width so the save
  // button keeps its place on the row instead of overflowing the panel.
  viewsInput:
    "h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  viewsSave:
    "ms-1.5 h-8 shrink-0 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50",
  viewsDivider: "my-1.5 border-border",
  // ── Bulk actions & selection ────────────────────────────────────
  bulkBar:
    "flex flex-wrap items-center gap-2 border-b border-border bg-accent/60 px-3 py-2 text-sm",
  bulkButton:
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50",
  bulkError: "text-sm font-medium text-destructive",
  selectAllBanner: "flex flex-wrap items-center gap-2",
  selectAllText: "text-xs text-muted-foreground",
  selectAllButton:
    "rounded-md px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-accent",
  selectionHeader: "w-11 border-b border-border bg-card px-3 py-2.5",
  selectionCell:
    "w-11 px-3 py-2.5 [&[data-pinned]]:bg-card [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  checkbox: "h-4 w-4 accent-primary",
  actionsHeader:
    "w-[120px] border-b border-border bg-card px-3 py-2.5 text-end font-medium text-muted-foreground",
  actionsCell:
    "px-3 py-2.5 text-end [&[data-pinned]]:bg-card [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  reorderHeader: "w-10 border-b border-border bg-card",
  reorderCell: "w-10 px-1 py-2.5",
  rowReorderHandle:
    "inline-grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent data-[dragging]:cursor-grabbing",
  rowReorderButtons: "mt-2 flex items-center gap-1",
  rowReorderUp:
    "inline-grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50",
  rowReorderDown:
    "inline-grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50",
  // ── Row expansion & detail ──────────────────────────────────────
  expandHeader: "w-8 border-b border-border bg-card",
  expandCell: "w-8 px-2 py-2.5",
  expandButton:
    "inline-grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-transform hover:bg-accent data-[expanded]:rotate-90",
  detailRow: "border-b border-border bg-muted/30",
  detailCell:
    "px-3 py-2.5 text-sm [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  cardDetail: "mt-2 border-t border-border pt-2 text-sm",
  // ── Row grouping ────────────────────────────────────────────────
  groupRow: "border-b border-border bg-muted/40",
  groupCell: "px-3 py-2 font-medium",
  // A footer reads as the group's own closing line: same surface, a top rule
  // instead of a bottom one, so it belongs to the block above it.
  groupFooterRow: "border-t border-border bg-muted/30",
  groupFooterCell: "px-3 py-2 font-medium",
  groupMoreRow: "bg-background",
  groupMoreCell: "px-3 py-2 text-sm text-muted-foreground",
  groupCard: "mb-1 rounded-lg bg-muted/40 px-3 py-2 font-medium",
  groupToggle:
    "inline-grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent",
  groupSelect: "h-4 w-4 accent-primary",
  groupLabel: "text-sm font-semibold",
  groupCount: "text-xs text-muted-foreground",
  groupAggregate: "ms-auto text-xs text-muted-foreground",
  // A rejected commit reads as a form error, in the destructive tone shadcn
  // already uses for one.
  editCellError: "mt-1 block text-xs text-destructive",
  editCellSaveError: "mt-1 flex items-center gap-2 text-xs text-destructive",
  editCellRollback: "underline underline-offset-2 hover:no-underline",
  // ── Tree data ───────────────────────────────────────────────────
  // The chevron matches the group toggle exactly: one table can hold both,
  // and two disclosure controls that look different read as two mechanisms.
  treeCell: "inline-flex items-center gap-1",
  treeToggle:
    "inline-grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-accent",
  treeSpacer: "inline-block h-6 w-6",
  // ── Cell editing ────────────────────────────────────────────────
  editCellActivate: "w-full cursor-text text-start",
  editCellEditor:
    "h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
  // ── Load more (infinite) ────────────────────────────────────────
  loadMore: "flex justify-center p-3",
  loadMoreButton:
    "inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50",
  // ── Summary row ─────────────────────────────────────────────────
  summary: "border-t border-border bg-muted/40 font-medium",
  summaryRow: "align-middle",
  summaryCell:
    "px-3 py-2.5 [[data-density=compact]_&]:px-2 [[data-density=compact]_&]:py-1.5",
  summaryCard:
    "mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm font-medium",
  // ── Loading, refresh, error ─────────────────────────────────────
  loading: "p-3",
  loadingTable: "w-full border-collapse",
  loadingHeaderRow: "border-b border-border",
  loadingHeaderCell: "px-3 py-2.5 text-start",
  loadingRow: "border-b border-border last:border-0",
  loadingCell: "px-3 py-2.5",
  loadingLine: "inline-block h-3 animate-pulse rounded bg-muted",
  loadingCards: "flex flex-col gap-2 p-3",
  loadingCard:
    "flex flex-col gap-2 rounded-lg border border-border p-3 [&>span]:inline-block [&>span]:h-3 [&>span]:animate-pulse [&>span]:rounded [&>span]:bg-muted",
  refreshIndicator:
    "h-0.5 w-full [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-primary",
  error: "flex flex-col items-center gap-1.5 px-4 py-10 text-center text-sm",
  retryButton:
    "mt-1 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent",
} satisfies Required<DataTableClassNames>;
